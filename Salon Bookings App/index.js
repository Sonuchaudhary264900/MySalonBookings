// Hermes disables WeakRef/FinalizationRegistry while a JS debugger (Chrome
// DevTools / Flipper) is attached during a Metro dev session, for
// determinism. React Navigation v7 uses WeakRef internally for its
// leak-detection warnings, which crashes navigators with "Property 'WeakRef'
// doesn't exist" whenever the debugger is attached — dev-only, never in a
// release build. These are lightweight fallbacks (no actual GC weakness,
// just enough surface area for React Navigation to run) so navigation still
// works while debugging.
if (typeof global.WeakRef === 'undefined') {
  global.WeakRef = class WeakRef {
    constructor(target) { this._target = target; }
    deref() { return this._target; }
  };
}
if (typeof global.FinalizationRegistry === 'undefined') {
  global.FinalizationRegistry = class FinalizationRegistry {
    register() {}
    unregister() {}
  };
}

import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
