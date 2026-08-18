import {
  clearGithubToken,
  getGithubToken,
} from '../credentials.js';
import {
  extensionForMimeType,
  fileToBase64,
  readJsonResponse,
} from '../utils.js';

const GITHUB_TIMEOUT_MS = 8000;

async function githubFetch(url, options = {}) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), GITHUB_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('GitHub comments timed out. The prototype is still available.');
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

function githubHeaders() {
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  const token = getGithubToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function handleGithubResponse(response, label) {
  if (response.status === 401 || response.status === 403) {
    if (getGithubToken()) {
      clearGithubToken();
      throw new Error(
        'Token rejected. Re-enter a token with Issues write and Contents write.',
      );
    }
  }
  return readJsonResponse(response, `${label} failed`);
}

function issueBody(meta) {
  let body = `<!-- hc:comment\n${JSON.stringify(meta, null, 2)}\n-->\n`;
  body += `**Page**: ${meta.page}\n`;
  body += `**Screen**: ${meta.screen}\n`;
  body += `**Name**: ${meta.name}\n`;
  body += `**Comment**: ${meta.comment}\n`;
  body += `**Element**: ${meta.target.selector || ''}\n`;
  body += `**Stable anchor**: ${meta.target.commentAnchor || ''}\n`;
  body += `**Context**: ${meta.target.context || ''}\n`;
  body += `**Anchor**: selector=${(meta.target.selector || '').replace(/\n/g, ' ')}, rx=${meta.target.relativeX}, ry=${meta.target.relativeY}\n`;
  body += `**Fallback**: x=${Math.round(meta.target.fallbackClientX)}, y=${Math.round(meta.target.fallbackClientY)}\n`;
  body += `**Viewport**: ${meta.viewport.width}x${meta.viewport.height}\n`;
  body += `**DocSize**: ${meta.docSize.width}x${meta.docSize.height}\n`;

  if (meta.images?.length) {
    body += '\n**Screenshots**:\n';
    meta.images.forEach((image, index) => {
      body += `- [Screenshot ${index + 1}](${image.url})\n`;
    });
    body += '\n';
    meta.images.forEach((image, index) => {
      body += `![Screenshot ${index + 1}](${image.url})\n`;
    });
  }
  return body;
}

function normalizeIssue(issue, project) {
  const match = (issue.body || '').match(/<!--\s*hc:comment\s*([\s\S]*?)\s*-->/);
  if (!match) return null;
  try {
    const meta = JSON.parse(match[1]);
    if (meta.project && meta.project !== project) return null;
    return {
      id: String(issue.number),
      issueNumber: issue.number,
      issueUrl: issue.html_url,
      title: issue.title,
      name: meta.name || issue.user?.login || 'Reviewer',
      text: meta.comment || '',
      screen: meta.screen || 'unknown',
      target: meta.target || {},
      images: meta.images || [],
      createdAt: meta.createdAt || issue.created_at,
      local: false,
    };
  } catch (error) {
    console.warn(`Bad comment JSON in issue #${issue.number}`, error);
    return null;
  }
}

export function createGithubCommentsAdapter(config) {
  const apiRoot = `https://api.github.com/repos/${config.repository}`;

  async function fetchIssuesPage(page = 1, accumulated = []) {
    const response = await githubFetch(
      `${apiRoot}/issues?state=open&per_page=100&page=${page}`,
      { headers: githubHeaders() },
    );
    const batch = await handleGithubResponse(response, 'Comment load');
    const issues = accumulated.concat(batch || []);
    return batch?.length === 100 ? fetchIssuesPage(page + 1, issues) : issues;
  }

  async function createIssue(meta) {
    if (!getGithubToken()) {
      throw new Error('GitHub token required to create comments');
    }
    const response = await githubFetch(`${apiRoot}/issues`, {
      method: 'POST',
      headers: { ...githubHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `[${config.page.toUpperCase()}] ${(
          meta.comment || 'Screenshot comment'
        ).slice(0, 72)}`,
        body: issueBody(meta),
        labels: ['web-comment', config.page],
      }),
    });
    return handleGithubResponse(response, 'Issue save');
  }

  async function updateIssue(number, meta) {
    const response = await githubFetch(`${apiRoot}/issues/${number}`, {
      method: 'PATCH',
      headers: { ...githubHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: issueBody(meta) }),
    });
    return handleGithubResponse(response, 'Issue update');
  }

  async function uploadImage(commentId, file, index) {
    if (!getGithubToken()) {
      throw new Error('GitHub token required to upload screenshots');
    }
    const type = file.type || 'image/png';
    const extension = extensionForMimeType(type);
    const path = `${config.assetDirectory}/${commentId}-${index}.${extension}`;
    const encodedPath = path.split('/').map(encodeURIComponent).join('/');
    const content = await fileToBase64(file);
    const response = await githubFetch(`${apiRoot}/contents/${encodedPath}`, {
      method: 'PUT',
      headers: { ...githubHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `docs: add App Builder P1 comment screenshot ${commentId}-${index}`,
        content,
        branch: config.dataBranch,
      }),
    });
    await handleGithubResponse(response, 'Screenshot upload');
    const rawPath = path.split('/').map(encodeURIComponent).join('/');
    return {
      path,
      url: `https://raw.githubusercontent.com/${config.repository}/${config.dataBranch}/${rawPath}`,
      name: file.name || `screenshot-${index}.${extension}`,
      type,
    };
  }

  return {
    mode: 'github',
    async load() {
      const issues = await fetchIssuesPage();
      return issues
        .filter(
          (issue) =>
            issue.title?.startsWith(`[${config.page.toUpperCase()}]`) &&
            !issue.pull_request,
        )
        .map((issue) => normalizeIssue(issue, config.project))
        .filter(Boolean)
        .reverse();
    },
    async save(meta, pendingImages) {
      let issue = await createIssue(meta);
      meta.issue = {
        number: issue.number,
        url: issue.html_url,
        title: issue.title,
      };
      if (pendingImages.length) {
        meta.images = await Promise.all(
          pendingImages.map(({ file }, index) =>
            uploadImage(`issue-${issue.number}`, file, index + 1),
          ),
        );
        issue = await updateIssue(issue.number, meta);
      }
      return normalizeIssue(issue, config.project);
    },
  };
}
