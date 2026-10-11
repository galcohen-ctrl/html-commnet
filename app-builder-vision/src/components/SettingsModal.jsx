import railHtml from '../templates/settings/rail.html?raw';
import generalHtml from '../templates/settings/pane-general.html?raw';
import workspaceHtml from '../templates/settings/pane-workspace.html?raw';
import appHtml from '../templates/settings/pane-app.html?raw';
import onlineOrderingHtml from '../templates/settings/pane-online-ordering.html?raw';
import publishingHtml from '../templates/settings/pane-publishing.html?raw';
import StaticMarkup from './StaticMarkup';

const panesHtml = [
  generalHtml,
  workspaceHtml,
  appHtml,
  onlineOrderingHtml,
  publishingHtml,
].join('\n');

export default function SettingsModal() {
  return (
    <div className="sm-overlay" id="settings-modal" data-comment-anchor="settings-modal">
      <div className="sm-modal" role="dialog" aria-modal="true" aria-label="Settings">
        <StaticMarkup as="div" style={{ display: 'contents' }} html={railHtml} />

        <section className="sm-main">
          <header className="sm-head">
            <button className="sm-back" id="sm-back" type="button" title="Back">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M11 18l-6-6 6-6" />
              </svg>
            </button>
            <div className="sm-head-text">
              <h2 className="sm-title" id="sm-title">General</h2>
              <p className="sm-sub" id="sm-sub" />
            </div>
            <button className="sm-close" id="sm-close" type="button" title="Close settings">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </header>

          <StaticMarkup
            as="div"
            className="sm-body"
            id="sm-body"
            data-comment-anchor="settings-modal-body"
            html={panesHtml}
          />

          <footer className="sm-foot">
            <button className="sm-help" type="button">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <circle cx="12" cy="12" r="3.4" />
                <path d="M14.4 9.6L18 6M9.6 14.4L6 18M14.4 14.4L18 18M9.6 9.6L6 6" />
              </svg>
              Need help? Visit the Help Center
            </button>
            <div className="sm-foot-actions">
              <button className="sm-btn ghost" id="sm-cancel" type="button">Cancel</button>
              <button className="sm-btn primary" id="sm-primary" type="button">Save changes</button>
            </div>
          </footer>
        </section>
      </div>
    </div>
  );
}
