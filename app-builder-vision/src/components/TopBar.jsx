import topBarHtml from '../templates/top-bar.html?raw';
import StaticMarkup from './StaticMarkup';

const start = topBarHtml.indexOf('<div class="topbar">');
const content = topBarHtml.slice(
  topBarHtml.indexOf('>', start) + 1,
  topBarHtml.lastIndexOf('</div>'),
);

export default function TopBar() {
  return (
    <StaticMarkup
      as="div"
      className="topbar"
      data-comment-anchor="top-bar"
      html={content}
    />
  );
}
