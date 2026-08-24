import welcomeHtml from '../templates/welcome-modal.html?raw';
import StaticMarkup from './StaticMarkup';

export default function WelcomeModal() {
  return <StaticMarkup as="div" style={{ display: 'contents' }} html={welcomeHtml} />;
}
