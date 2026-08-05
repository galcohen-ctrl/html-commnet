import { initSystem } from './system.js';
import { initCoreNavigation } from './coreNavigation.js';
import { initBindings } from './bindings.js';
import { initBranding } from './branding.js';
import { initPromoWidgets } from './promoWidgets.js';
import { initRewards } from './rewards.js';
import { initReordering } from './reordering.js';
import { initSetupWizard } from './setupWizard.js';

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
  initSetupWizard(runtime);
  return runtime;
}
