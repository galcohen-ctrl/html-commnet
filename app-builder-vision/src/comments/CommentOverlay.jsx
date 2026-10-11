import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  chooseCommentAnchor,
  isCommentOverlayElement,
  isCommentOverlayMutation,
  pinPositionForComment,
  screenForElement,
  selectorForElement,
  targetForPoint,
} from './anchors.js';
import { createGithubCommentsAdapter } from './adapters/github.js';
import { createLocalCommentsAdapter } from './adapters/local.js';
import { DEFAULT_COMMENT_CONFIG, getCommentMode } from './config.js';
import {
  getGithubToken,
  getReviewerName,
  setGithubToken,
  setReviewerName,
} from './credentials.js';
import { isVisible } from './utils.js';

function positionPanel(clientX, clientY) {
  const gap = 12;
  const panelWidth = 336;
  const panelHeight = 300;
  let left = clientX + 16;
  if (left + panelWidth > window.innerWidth - gap) left = clientX - panelWidth - 16;
  if (left < gap) left = gap;
  let top = clientY;
  if (top + panelHeight > window.innerHeight - gap) {
    top = window.innerHeight - panelHeight - gap;
  }
  return { left, top: Math.max(gap, top) };
}

function CommentBubble({
  anchor,
  comment,
  layoutVersion,
  onClose,
  onOpenImage,
  onResolve,
  resolving,
}) {
  const bubbleRef = useRef(null);
  const [position, setPosition] = useState({ left: 12, top: 12 });

  useLayoutEffect(() => {
    if (!anchor?.isConnected || !isVisible(anchor)) {
      onClose();
      return;
    }
    const bubble = bubbleRef.current;
    if (!bubble) return;
    const anchorRect = anchor.getBoundingClientRect();
    const bubbleRect = bubble.getBoundingClientRect();
    const width = bubbleRect.width || 300;
    const height = bubbleRect.height || 100;
    let left = anchorRect.right + 8;
    if (left + width > window.innerWidth - 12) left = anchorRect.left - width - 8;
    if (left < 12) left = 12;
    let top = anchorRect.top;
    if (top + height > window.innerHeight - 12) {
      top = window.innerHeight - height - 12;
    }
    setPosition({ left, top: Math.max(12, top) });
  }, [anchor, comment, layoutVersion, onClose]);

  return (
    <div
      ref={bubbleRef}
      className="hc-cbubble"
      data-comment-id={comment.id}
      data-comment-overlay
      style={position}
    >
      <div className="hc-cb-name">{comment.name || 'Reviewer'}</div>
      {comment.target?.selector ? (
        <div className="hc-cb-ctx">{comment.target.selector}</div>
      ) : null}
      <div className="hc-cb-text">{comment.text || ''}</div>
      {comment.images?.length ? (
        <div className="hc-cb-images">
          {comment.images.map((image, index) => (
            <button
              key={`${image.url}-${index}`}
              type="button"
              className="hc-img-thumb"
              onClick={() =>
                onOpenImage(image.url, image.name || `Screenshot ${index + 1}`)
              }
            >
              <img src={image.url} alt={`Screenshot ${index + 1}`} />
            </button>
          ))}
        </div>
      ) : null}
      {comment.issueUrl ? (
        <div className="hc-cb-action">
          <a target="_blank" rel="noreferrer" href={comment.issueUrl}>
            Open GitHub issue
          </a>
        </div>
      ) : null}
      {comment.local ? (
        <div className="hc-cb-action">
          <button
            type="button"
            className="hc-ann-btn hc-local-resolve"
            onClick={() => onResolve(comment)}
            disabled={resolving}
          >
            {resolving ? 'Resolving…' : 'Mark resolved (delete)'}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function AnnotationPanel({
  draft,
  error,
  onCancel,
  onPaste,
  onRemoveImage,
  onSave,
  pendingImages,
  saving,
  setText,
  text,
}) {
  const textareaRef = useRef(null);
  useEffect(() => textareaRef.current?.focus(), []);

  return (
    <div
      className="hc-ann-panel"
      data-comment-overlay
      style={positionPanel(draft.clientX, draft.clientY)}
    >
      <div className="hc-ann-sec">
        {draft.target.selector ? (
          <div className="hc-ctx-card">{draft.target.selector}</div>
        ) : null}
        {draft.target.context ? (
          <div className="hc-ctx-sub">“{draft.target.context.slice(0, 70)}”</div>
        ) : null}
      </div>
      <div className="hc-ann-sec">
        <textarea
          ref={textareaRef}
          className={`hc-ann-ta${error ? ' err' : ''}`}
          placeholder="Describe the issue or suggestion..."
          value={text}
          onChange={(event) => setText(event.target.value)}
          onPaste={onPaste}
          onKeyDown={(event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') onSave();
          }}
        />
        <div className="hc-paste-hint">Paste screenshots here before submitting.</div>
        <div className="hc-previews">
          {pendingImages.map((image, index) => (
            <div className="hc-thumb" key={image.url}>
              <img src={image.url} alt={`Pending screenshot ${index + 1}`} />
              <button
                type="button"
                title="Remove image"
                onClick={() => onRemoveImage(index)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>
      <div className="hc-ann-foot">
        <button
          type="button"
          className="hc-ann-btn hc-ann-cancel"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </button>
        <button
          type="button"
          className="hc-ann-btn hc-ann-save"
          onClick={onSave}
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Submit'}
        </button>
      </div>
    </div>
  );
}

export default function CommentOverlay({ config: configOverrides, onCommentsChange }) {
  const repository =
    configOverrides?.repository || DEFAULT_COMMENT_CONFIG.repository;
  const page = configOverrides?.page || DEFAULT_COMMENT_CONFIG.page;
  const project = configOverrides?.project || DEFAULT_COMMENT_CONFIG.project;
  const dataBranch =
    configOverrides?.dataBranch || DEFAULT_COMMENT_CONFIG.dataBranch;
  const assetDirectory =
    configOverrides?.assetDirectory || DEFAULT_COMMENT_CONFIG.assetDirectory;
  const configuredMode = configOverrides?.mode;
  const mode = useMemo(
    () => configuredMode || getCommentMode(),
    [configuredMode],
  );
  const config = useMemo(
    () => ({ repository, page, project, dataBranch, assetDirectory }),
    [repository, page, project, dataBranch, assetDirectory],
  );
  const adapter = useMemo(
    () =>
      mode === 'local'
        ? createLocalCommentsAdapter(config)
        : createGithubCommentsAdapter(config),
    [config, mode],
  );

  const [comments, setComments] = useState([]);
  const [commentMode, setCommentMode] = useState(false);
  const [tokenModalOpen, setTokenModalOpen] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [nameInput, setNameInput] = useState(() => getReviewerName());
  const [highlight, setHighlight] = useState(null);
  const highlightElement = useRef(null);
  const [draft, setDraft] = useState(null);
  const [draftText, setDraftText] = useState('');
  const [draftError, setDraftError] = useState(false);
  const [pendingImages, setPendingImages] = useState([]);
  const pendingImagesRef = useRef([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bubble, setBubble] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [resolvingId, setResolvingId] = useState(null);
  const [toast, setToast] = useState(null);
  const [layoutVersion, setLayoutVersion] = useState(0);
  const layoutFrame = useRef(null);

  useEffect(() => {
    pendingImagesRef.current = pendingImages;
  }, [pendingImages]);

  useEffect(
    () => () => {
      pendingImagesRef.current.forEach((image) => URL.revokeObjectURL(image.url));
    },
    [],
  );

  const showToast = useCallback((message) => {
    setToast({ id: Date.now(), message });
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    onCommentsChange?.(comments);
  }, [comments, onCommentsChange]);

  const loadComments = useCallback(async () => {
    setLoading(true);
    try {
      const loaded = await adapter.load();
      setComments(loaded);
      showToast(
        loaded.length
          ? `Loaded ${loaded.length} ${mode === 'local' ? 'local ' : ''}comment${
              loaded.length === 1 ? '' : 's'
            }`
          : `No ${mode === 'local' ? 'local ' : ''}comments yet`,
      );
    } catch (error) {
      console.warn('Could not load comments:', error);
      showToast(error.message || 'Could not load comments');
    } finally {
      setLoading(false);
    }
  }, [adapter, mode, showToast]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const closeDraft = useCallback(() => {
    setPendingImages((images) => {
      images.forEach((image) => URL.revokeObjectURL(image.url));
      return [];
    });
    setDraft(null);
    setDraftText('');
    setDraftError(false);
    setSaving(false);
  }, []);

  const closePanels = useCallback(() => {
    closeDraft();
    setBubble(null);
  }, [closeDraft]);

  const scheduleLayout = useCallback(() => {
    if (layoutFrame.current !== null) return;
    layoutFrame.current = window.requestAnimationFrame(() => {
      layoutFrame.current = null;
      setLayoutVersion((version) => version + 1);
      const element = highlightElement.current;
      if (element && isVisible(element)) {
        const rect = element.getBoundingClientRect();
        setHighlight((current) =>
          current
            ? {
                ...current,
                left: rect.left,
                top: rect.top,
                width: rect.width,
                height: rect.height,
              }
            : null,
        );
      }
    });
  }, []);

  useEffect(() => {
    document.addEventListener('scroll', scheduleLayout, true);
    window.addEventListener('resize', scheduleLayout);
    const observer = new MutationObserver((mutations) => {
      if (mutations.some((mutation) => !isCommentOverlayMutation(mutation))) {
        scheduleLayout();
      }
    });
    observer.observe(document.body, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ['class', 'style'],
    });
    return () => {
      document.removeEventListener('scroll', scheduleLayout, true);
      window.removeEventListener('resize', scheduleLayout);
      observer.disconnect();
      if (layoutFrame.current !== null) {
        window.cancelAnimationFrame(layoutFrame.current);
      }
    };
  }, [scheduleLayout]);

  useEffect(() => {
    document.body.classList.toggle('hc-mode', commentMode);
    if (!commentMode) {
      highlightElement.current = null;
      setHighlight(null);
    }
    return () => document.body.classList.remove('hc-mode');
  }, [commentMode]);

  useEffect(() => {
    const onMouseMove = (event) => {
      if (!commentMode || isCommentOverlayElement(event.target)) {
        highlightElement.current = null;
        setHighlight(null);
        return;
      }
      const element = chooseCommentAnchor(
        document.elementFromPoint(event.clientX, event.clientY),
      );
      if (!element || !isVisible(element)) return;
      const rect = element.getBoundingClientRect();
      highlightElement.current = element;
      setHighlight({
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        label: selectorForElement(element) || element.tagName.toLowerCase(),
      });
    };

    const onDocumentClick = (event) => {
      if (isCommentOverlayElement(event.target)) return;
      if (!commentMode) {
        setBubble(null);
        if (draft) closeDraft();
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      const anchor = chooseCommentAnchor(
        document.elementFromPoint(event.clientX, event.clientY),
      );
      setCommentMode(false);
      if (!anchor) return;
      setBubble(null);
      setDraft({
        anchor,
        clientX: event.clientX,
        clientY: event.clientY,
        screen: screenForElement(anchor),
        target: targetForPoint(anchor, event.clientX, event.clientY),
      });
      setDraftText('');
      setDraftError(false);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('click', onDocumentClick, true);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('click', onDocumentClick, true);
    };
  }, [closeDraft, commentMode, draft]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      if (imagePreview) {
        setImagePreview(null);
      } else if (draft || bubble) {
        closePanels();
      } else if (commentMode) {
        setCommentMode(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [bubble, closePanels, commentMode, draft, imagePreview]);

  const beginCommentMode = useCallback(() => {
    if (commentMode) {
      setCommentMode(false);
      closePanels();
      return;
    }
    if (mode === 'github' && !getGithubToken()) {
      setTokenInput('');
      setNameInput(getReviewerName());
      setTokenModalOpen(true);
      return;
    }
    closePanels();
    setCommentMode(true);
  }, [closePanels, commentMode, mode]);

  const saveCredentials = useCallback(
    (event) => {
      event.preventDefault();
      if (!tokenInput.trim()) {
        showToast('Please paste your GitHub token first.');
        return;
      }
      setGithubToken(tokenInput);
      setReviewerName(nameInput);
      setTokenModalOpen(false);
      closePanels();
      setCommentMode(true);
    },
    [closePanels, nameInput, showToast, tokenInput],
  );

  const addClipboardImages = useCallback((event) => {
    const files = [...(event.clipboardData?.items || [])]
      .filter((item) => item.type?.startsWith('image/'))
      .map((item) => item.getAsFile())
      .filter(Boolean);
    if (!files.length) return;
    event.preventDefault();
    setPendingImages((images) => [
      ...images,
      ...files.map((file) => ({ file, url: URL.createObjectURL(file) })),
    ]);
  }, []);

  const removePendingImage = useCallback((index) => {
    setPendingImages((images) => {
      const next = [...images];
      const [removed] = next.splice(index, 1);
      if (removed) URL.revokeObjectURL(removed.url);
      return next;
    });
  }, []);

  const saveComment = useCallback(async () => {
    const trimmedText = draftText.trim();
    if (!draft || (!trimmedText && !pendingImages.length)) {
      setDraftError(true);
      return;
    }
    setSaving(true);
    setDraftError(false);
    const meta = {
      version: 4,
      project,
      page,
      screen: draft.screen,
      name: getReviewerName(),
      comment: trimmedText,
      target: draft.target,
      images: [],
      viewport: { width: window.innerWidth, height: window.innerHeight },
      docSize: {
        width: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight,
      },
      createdAt: new Date().toISOString(),
    };
    try {
      const saved = await adapter.save(meta, pendingImages);
      setComments((existing) => [...existing, saved]);
      closeDraft();
      showToast('Comment saved');
    } catch (error) {
      setSaving(false);
      showToast(error.message || 'Could not save comment');
    }
  }, [adapter, closeDraft, draft, draftText, page, pendingImages, project, showToast]);

  const resolveComment = useCallback(
    async (comment) => {
      if (!adapter.resolve) return;
      setResolvingId(comment.id);
      try {
        await adapter.resolve(comment);
        setComments((existing) => existing.filter((item) => item.id !== comment.id));
        setBubble(null);
        showToast('Local comment resolved');
      } catch (error) {
        showToast(error.message || 'Could not resolve local comment');
      } finally {
        setResolvingId(null);
      }
    },
    [adapter, showToast],
  );

  return (
    <div id="hc-comment-overlay-root" data-comment-overlay>
      {mode === 'local' ? <div id="hc-mode-badge">LOCAL MODE</div> : null}
      <div id="hc-fab">
        <button
          type="button"
          id="hc-refresh-btn"
          onClick={loadComments}
          disabled={loading}
        >
          {loading ? '↺ Loading…' : '↺ Refresh'}
        </button>
        <button
          type="button"
          id="hc-add-btn"
          className={commentMode ? 'hc-on' : ''}
          onClick={beginCommentMode}
        >
          {commentMode ? 'Click to comment' : 'Add comment'}
        </button>
      </div>

      {highlight ? (
        <>
          <div
            id="hc-highlight"
            style={{
              display: 'block',
              left: highlight.left,
              top: highlight.top,
              width: highlight.width,
              height: highlight.height,
            }}
          />
          <div
            id="hc-highlight-label"
            style={{
              display: 'block',
              left: Math.max(8, highlight.left),
              top:
                highlight.top < 20
                  ? highlight.top + highlight.height + 5
                  : highlight.top - 18,
            }}
          >
            {highlight.label}
          </div>
        </>
      ) : null}

      <div id="hc-pin-layer">
        {comments.map((comment, index) => {
          // layoutVersion intentionally makes positions refresh after product DOM mutations.
          void layoutVersion;
          const position = pinPositionForComment(comment);
          return (
            <div
              key={comment.id}
              className="hc-pin"
              data-comment-id={comment.id}
              style={{
                left: position.x,
                top: position.y,
                display: position.visible ? undefined : 'none',
              }}
            >
              <button
                type="button"
                className="hc-pin-btn"
                title={`${comment.name || 'Reviewer'}: ${comment.text || ''}`}
                onClick={(event) => {
                  event.stopPropagation();
                  const anchor = event.currentTarget;
                  setBubble((current) =>
                    current?.comment.id === comment.id
                      ? null
                      : { comment, anchor },
                  );
                }}
              >
                {index + 1}
              </button>
            </div>
          );
        })}
      </div>

      {draft ? (
        <AnnotationPanel
          draft={draft}
          error={draftError}
          onCancel={closeDraft}
          onPaste={addClipboardImages}
          onRemoveImage={removePendingImage}
          onSave={saveComment}
          pendingImages={pendingImages}
          saving={saving}
          setText={setDraftText}
          text={draftText}
        />
      ) : null}

      {bubble ? (
        <CommentBubble
          anchor={bubble.anchor}
          comment={bubble.comment}
          layoutVersion={layoutVersion}
          onClose={() => setBubble(null)}
          onOpenImage={(url, name) => setImagePreview({ url, name })}
          onResolve={resolveComment}
          resolving={resolvingId === bubble.comment.id}
        />
      ) : null}

      {imagePreview ? (
        <div
          className="hc-img-modal"
          data-comment-overlay
          onClick={(event) => {
            if (event.target === event.currentTarget) setImagePreview(null);
          }}
        >
          <div className="hc-img-box">
            <div className="hc-img-top">
              <span>{imagePreview.name || 'Screenshot'}</span>
              <div>
                <a href={imagePreview.url} target="_blank" rel="noreferrer">
                  Open original
                </a>{' '}
                <button
                  className="hc-img-close"
                  type="button"
                  title="Close"
                  onClick={() => setImagePreview(null)}
                >
                  ×
                </button>
              </div>
            </div>
            <img
              src={imagePreview.url}
              alt={imagePreview.name || 'Screenshot'}
            />
          </div>
        </div>
      ) : null}

      {tokenModalOpen ? (
        <div id="hc-modal" className="open" data-comment-overlay>
          <form id="hc-modal-box" onSubmit={saveCredentials}>
            <h3>🔑 One-time GitHub setup</h3>
            <p>
              Please paste the GitHub token Gal sent you. It needs Issues write +
              Contents write for this repo.
            </p>
            <input
              id="hc-tok"
              type="password"
              placeholder="Paste token here (stays in your browser only)"
              value={tokenInput}
              onChange={(event) => setTokenInput(event.target.value)}
              autoFocus
            />
            <input
              id="hc-nam"
              type="text"
              placeholder="Your name (e.g. Gal, Roy, Kobi)"
              value={nameInput}
              onChange={(event) => setNameInput(event.target.value)}
            />
            <div className="hc-modal-btns">
              <button
                type="button"
                className="hc-btn-s"
                onClick={() => setTokenModalOpen(false)}
              >
                Cancel
              </button>
              <button type="submit" className="hc-btn-p">
                Save &amp; continue
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {toast ? <div id="hc-toast">{toast.message}</div> : null}
    </div>
  );
}
