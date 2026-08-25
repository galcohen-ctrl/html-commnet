import brandingHtml from '../templates/config/branding.html?raw';
import homeMasterHtml from '../templates/config/home-master.html?raw';
import profileHtml from '../templates/config/profile.html?raw';
import promoFeaturedCardHtml from '../templates/config/promo-featured-card.html?raw';
import promoFeaturedHtml from '../templates/config/promo-featured.html?raw';
import promoMoreCardHtml from '../templates/config/promo-more-card.html?raw';
import promoMoreHtml from '../templates/config/promo-more.html?raw';
import socialHtml from '../templates/config/social.html?raw';
import orderAgainHtml from '../templates/config/order-again.html?raw';
import topItemsHtml from '../templates/config/top-items.html?raw';
import menuCategoriesHtml from '../templates/config/menu-categories.html?raw';
import menuReelsHtml from '../templates/config/menu-reels.html?raw';
import locationsHtml from '../templates/config-locations.html?raw';
import menuHtml from '../templates/config-menu.html?raw';
import moreHtml from '../templates/config-more.html?raw';
import rewardsHtml from '../templates/config-rewards.html?raw';
import businessHtml from '../templates/config-business.html?raw';
import appFocusHtml from '../templates/config-app-focus.html?raw';
import brandingStepHtml from '../templates/config-branding.html?raw';
import publishHtml from '../templates/config-publish.html?raw';
import StaticMarkup from './StaticMarkup';

const homeHtml = [
  homeMasterHtml,
  profileHtml,
  promoFeaturedHtml,
  promoFeaturedCardHtml,
  promoMoreHtml,
  promoMoreCardHtml,
  socialHtml,
  orderAgainHtml,
  topItemsHtml,
  menuCategoriesHtml,
  menuReelsHtml,
  brandingHtml,
].join('\n');

const pageInner = (html) => {
  const start = html.indexOf('<div class="cp-page"');
  return html.slice(html.indexOf('>', start) + 1, html.lastIndexOf('</div>'));
};

export default function ConfigPanel() {
  return (
    <div className="config-column" data-comment-anchor="config-column">
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
        <StaticMarkup
          as="div"
          className="cp-page"
          id="cp-business"
          data-comment-anchor="config-business"
          style={{ display: 'none' }}
          html={businessHtml}
        />
        <StaticMarkup
          as="div"
          className="cp-page"
          id="cp-app-focus"
          data-comment-anchor="config-app-focus"
          style={{ display: 'none' }}
          html={appFocusHtml}
        />
        <StaticMarkup
          as="div"
          className="cp-page"
          id="cp-branding"
          data-comment-anchor="config-branding-step"
          style={{ display: 'none' }}
          html={brandingStepHtml}
        />
        <StaticMarkup
          as="div"
          className="cp-page"
          id="cp-publish"
          data-comment-anchor="config-publish"
          style={{ display: 'none' }}
          html={publishHtml}
        />
      </div>

      <div className="cp-step-foot" data-comment-anchor="step-footer">
        <button className="cp-step-back" id="gf-step-back" type="button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M11 18l-6-6 6-6" /></svg>
          {' Back'}
        </button>
        <button className="cp-step-next" id="gf-step-next" type="button">
          {'Save and continue '}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </button>
      </div>
    </div>
  );
}
