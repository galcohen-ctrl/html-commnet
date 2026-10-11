import sidebarHtml from '../templates/sidebar.html?raw';
import StaticMarkup from './StaticMarkup';

const start = sidebarHtml.indexOf('<aside');
const content = sidebarHtml.slice(
  sidebarHtml.indexOf('>', start) + 1,
  sidebarHtml.lastIndexOf('</aside>'),
);

export default function Sidebar() {
  return (
    <StaticMarkup
      as="aside"
      className="side-nav"
      id="side-nav"
      data-comment-anchor="screen-navigation"
      html={content}
    />
  );
}
