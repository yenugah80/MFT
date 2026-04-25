// Polyfill WeakRef for Hermes builds that don't expose it globally
// (e.g. hermes-stable transform profile on some Android API levels)
if (!global.WeakRef) {
  global.WeakRef = class WeakRef {
    constructor(target) {
      this._target = target;
    }
    deref() {
      return this._target;
    }
  };
}
