import setupWizardHtml from '../templates/setup-wizard.html?raw';
import StaticMarkup from './StaticMarkup';

const start = setupWizardHtml.indexOf('<div class="setup-wizard"');
const content = setupWizardHtml.slice(
  setupWizardHtml.indexOf('>', start) + 1,
  setupWizardHtml.lastIndexOf('</div>'),
);

export default function SetupWizard() {
  return (
    <StaticMarkup
      as="div"
      className="setup-wizard"
      id="setup-wizard"
      data-comment-anchor="setup-wizard"
      html={content}
    />
  );
}
