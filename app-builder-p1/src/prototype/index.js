import { initSystem } from './system.js';
import { initCoreNavigation } from './coreNavigation.js';
import { initBindings } from './bindings.js';
import { initBranding } from './branding.js';
import { initPromoWidgets } from './promoWidgets.js';
import { initRewards } from './rewards.js';
import { initReordering } from './reordering.js';
import { initGuidedFlow } from './guidedFlow.js';
import { initSettingsModal } from './settingsModal.js';
import { initMenuSource } from './menuSource.js';
import { initSkeletonPreview } from './guidedFlowSkeleton.js';
import { initOrderingWidgets } from './orderingWidgets.js';
import { initRewardsBlocks } from './rewardsBlocks.js';
import { initGhostPreview } from './ghostPreview.js';

let runtime;

/** Initialize the DOM-driven prototype once and return its shared feature API. */
export function initPrototype() {
  if (runtime) return runtime;
  runtime = {};
  Object.assign(runtime, initSystem(runtime));
  Object.assign(runtime, initCoreNavigation(runtime));
  Object.assign(runtime, initBindings(runtime));
  Object.assign(runtime, initBranding(runtime));
  Object.assign(runtime, initPromoWidgets(runtime));
  Object.assign(runtime, initRewards(runtime));
  Object.assign(runtime, initReordering(runtime));
  Object.assign(runtime, initSettingsModal(runtime));
  Object.assign(runtime, initMenuSource(runtime));
  Object.assign(runtime, initOrderingWidgets(runtime));
  Object.assign(runtime, initRewardsBlocks(runtime));
  Object.assign(runtime, initGuidedFlow(runtime));
  Object.assign(runtime, initSkeletonPreview(runtime));
  Object.assign(runtime, initGhostPreview(runtime));
  return runtime;
}
