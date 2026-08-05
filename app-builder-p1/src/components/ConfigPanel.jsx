import brandingHtml from '../templates/config/branding.html?raw';
import homeMasterHtml from '../templates/config/home-master.html?raw';
import profileHtml from '../templates/config/profile.html?raw';
import promoFeaturedCardHtml from '../templates/config/promo-featured-card.html?raw';
import promoFeaturedHtml from '../templates/config/promo-featured.html?raw';
import promoMoreCardHtml from '../templates/config/promo-more-card.html?raw';
import promoMoreHtml from '../templates/config/promo-more.html?raw';
import socialHtml from '../templates/config/social.html?raw';
import locationsHtml from '../templates/config-locations.html?raw';
import menuHtml from '../templates/config-menu.html?raw';
import moreHtml from '../templates/config-more.html?raw';
import rewardsHtml from '../templates/config-rewards.html?raw';
import StaticMarkup from './StaticMarkup';

const homeHtml = [
  homeMasterHtml,
  profileHtml,
  promoFeaturedHtml,
  promoFeaturedCardHtml,
  promoMoreHtml,
  promoMoreCardHtml,
  socialHtml,
  brandingHtml,
].join('\n');

const pageInner = (html) => {
  const start = html.indexOf('<div class="cp-page"');
  return html.slice(html.indexOf('>', start) + 1, html.lastIndexOf('</div>'));
};

export default function ConfigPanel() {
  return (
    <div
      className="config-panel"
      id="config-panel"
      data-comment-anchor="configuration-panel"
    >
      <StaticMarkup
        as="div"
        className="cp-page"
        id="cp-home"
        data-comment-anchor="config-home"
        style={{ display: 'flex' }}
        html={homeHtml}
      />
      <StaticMarkup
        as="div"
        className="cp-page"
        id="cp-rewards"
        data-comment-anchor="config-rewards"
        style={{ display: 'none' }}
        html={pageInner(rewardsHtml)}
      />
      <StaticMarkup
        as="div"
        className="cp-page"
        id="cp-locations"
        data-comment-anchor="config-locations"
        style={{ display: 'none' }}
        html={pageInner(locationsHtml)}
      />
      <StaticMarkup
        as="div"
        className="cp-page"
        id="cp-menu"
        data-comment-anchor="config-menu"
        style={{ display: 'none' }}
        html={pageInner(menuHtml)}
      />
      <StaticMarkup
        as="div"
        className="cp-page"
        id="cp-more"
        data-comment-anchor="config-more"
        style={{ display: 'none' }}
        html={pageInner(moreHtml)}
      />
    </div>
  );
}
