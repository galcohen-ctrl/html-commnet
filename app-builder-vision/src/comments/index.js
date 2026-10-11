import './comments.css';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import CommentOverlay from './CommentOverlay.jsx';

export { CommentOverlay };
export {
  DEFAULT_COMMENT_CONFIG,
  getCommentMode,
  resolveCommentConfig,
} from './config.js';

/**
 * Imperative entrypoint used by the application shell's lazy comments import.
 * The returned function removes every listener and DOM node owned by the overlay.
 */
export function initComments(options = {}) {
  if (typeof document === 'undefined') return () => {};

  const existing = document.getElementById('hc-comments-react-mount');
  existing?.__hcDispose?.();

  const mountNode = document.createElement('div');
  mountNode.id = 'hc-comments-react-mount';
  mountNode.setAttribute('data-comment-overlay', '');
  document.body.appendChild(mountNode);

  const root = createRoot(mountNode);
  root.render(
    createElement(CommentOverlay, {
      config: options.config,
      onCommentsChange: options.onCommentsChange,
    }),
  );

  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    mountNode.remove();
    // A parent React root may be reconciling during Vite HMR. Remove the
    // overlay immediately, then tear down its nested root after that pass.
    queueMicrotask(() => root.unmount());
  };
  mountNode.__hcDispose = dispose;
  return dispose;
}
