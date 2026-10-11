import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repository = 'galcohen-ctrl/html-commnet';
const issuePrefix = '[APP-BUILDER-P1]';
const outputDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../review-comments',
);
const screenshotsDirectory = path.join(outputDirectory, 'screenshots');
const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

const headers = {
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'app-builder-review-pull',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
};

async function githubJson(url) {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub request failed (${response.status}): ${body.slice(0, 240)}`);
  }
  return response.json();
}

async function loadOpenIssues() {
  const issues = [];
  for (let page = 1; ; page += 1) {
    const batch = await githubJson(
      `https://api.github.com/repos/${repository}/issues?state=open&per_page=100&page=${page}`,
    );
    issues.push(...batch);
    if (batch.length < 100) return issues;
  }
}

function commentMetadata(body = '') {
  const match = body.match(/<!--\s*hc:comment\s*([\s\S]*?)\s*-->/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

function safeExtension(url, type = '') {
  const fromUrl = path.extname(new URL(url).pathname).toLowerCase();
  if (/^\.(png|jpe?g|webp|gif)$/.test(fromUrl)) return fromUrl;
  const byType = {
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/webp': '.webp',
    'image/gif': '.gif',
  };
  return byType[type] || '.bin';
}

async function downloadScreenshots(issueNumber, images = []) {
  return Promise.all(
    images.map(async (image, index) => {
      const extension = safeExtension(image.url, image.type);
      const filename = `issue-${issueNumber}-${index + 1}${extension}`;
      const localPath = path.join('screenshots', filename);
      const response = await fetch(image.url, { headers: { 'User-Agent': headers['User-Agent'] } });
      if (!response.ok) {
        return { ...image, localPath: null, downloadError: `HTTP ${response.status}` };
      }
      await writeFile(
        path.join(outputDirectory, localPath),
        Buffer.from(await response.arrayBuffer()),
      );
      return { ...image, localPath };
    }),
  );
}

function markdownFor(comments) {
  const lines = [
    '# Open App Builder review comments',
    '',
    `Generated from ${repository}. These files are local and gitignored.`,
    '',
  ];
  if (!comments.length) return `${lines.join('\n')}No open App Builder comments.\n`;
  comments.forEach((comment) => {
    lines.push(`## #${comment.number}: ${comment.comment || comment.title}`, '');
    lines.push(`- Issue: ${comment.url}`);
    lines.push(`- Screen: ${comment.screen || 'unknown'}`);
    lines.push(`- Stable anchor: ${comment.target?.commentAnchor || 'none'}`);
    lines.push(`- Selector: ${comment.target?.selector || 'none'}`);
    lines.push(`- Context: ${comment.target?.context || 'none'}`);
    comment.images.forEach((image, index) => {
      const target = image.localPath || image.url;
      lines.push(`- Screenshot ${index + 1}: [${target}](${target})`);
    });
    lines.push('', comment.comment || '', '');
  });
  return `${lines.join('\n')}\n`;
}

async function main() {
  const issues = (await loadOpenIssues()).filter(
    (issue) => !issue.pull_request && issue.title?.startsWith(issuePrefix),
  );
  await rm(outputDirectory, { recursive: true, force: true });
  await mkdir(screenshotsDirectory, { recursive: true });

  const comments = [];
  for (const issue of issues) {
    const metadata = commentMetadata(issue.body) || {};
    comments.push({
      number: issue.number,
      title: issue.title,
      url: issue.html_url,
      author: issue.user?.login || 'unknown',
      createdAt: issue.created_at,
      screen: metadata.screen || 'unknown',
      comment: metadata.comment || '',
      target: metadata.target || {},
      images: await downloadScreenshots(issue.number, metadata.images || []),
      metadata,
    });
  }

  await writeFile(
    path.join(outputDirectory, 'github-open-comments.json'),
    `${JSON.stringify(comments, null, 2)}\n`,
  );
  await writeFile(
    path.join(outputDirectory, 'README.md'),
    markdownFor(comments),
  );
  console.log(`Pulled ${comments.length} open App Builder comment${comments.length === 1 ? '' : 's'} into review-comments/.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
