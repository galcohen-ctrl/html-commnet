import accountHtml from '../templates/phone/account.html?raw';
import bottomNavHtml from '../templates/phone/bottom-nav.html?raw';
import homeCafeHtml from '../templates/phone/home-cafe.html?raw';
import homeHtml from '../templates/phone/home.html?raw';
import locationsHtml from '../templates/phone/locations.html?raw';
import loginHtml from '../templates/phone/login.html?raw';
import memberExperiencesHtml from '../templates/phone/member-experiences.html?raw';
import menuHtml from '../templates/phone/menu.html?raw';
import modalsHtml from '../templates/phone/modals.html?raw';
import moreHtml from '../templates/phone/more.html?raw';
import qrHtml from '../templates/phone/qr.html?raw';
import reelsModalHtml from '../templates/phone/reels-modal.html?raw';
import rewardsHtml from '../templates/phone/rewards.html?raw';
import StaticMarkup from './StaticMarkup';

const pagesHtml = [
  homeHtml,
  homeCafeHtml,
  rewardsHtml,
  locationsHtml,
  menuHtml,
  moreHtml,
  qrHtml,
  accountHtml,
  loginHtml,
  memberExperiencesHtml,
].join('\n');

const modalsCombinedHtml = modalsHtml + '\n' + reelsModalHtml;

const bottomNavStart = bottomNavHtml.indexOf('<div class="bottom-nav"');
const bottomNavInner = bottomNavHtml.slice(
  bottomNavHtml.indexOf('>', bottomNavStart) + 1,
  bottomNavHtml.lastIndexOf('</div>'),
);

export default function PhonePreview() {
  return (
    <div
      className="preview-area"
      id="preview-area"
      data-comment-anchor="phone-preview"
    >
      <div className="device-stage" id="device-stage">
        <div className="device-frame" id="device-frame">
          <div className="device-screen">
            <div className="status-bar">
              <span id="clock">9:41</span>
              <div className="icons">
                <span>􀙇</span>
                <span>􀋉</span>
                <span className="battery"><span className="fill" /></span>
              </div>
            </div>

            <StaticMarkup
              as="div"
              className="app-shell"
              id="app-shell"
              data-comment-anchor="phone-screen"
              html={pagesHtml}
            />

            <div dangerouslySetInnerHTML={{ __html: modalsCombinedHtml }} />

            <StaticMarkup
              as="div"
              className="bottom-nav"
              id="bottom-nav"
              data-comment-anchor="phone-bottom-navigation"
              html={bottomNavInner}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
