'use strict';

// Empty shell: display only the identity metadata exposed by the preload
// bridge. No feature logic — this file exists to prove the wiring works.
const api = window.eyeflow || {};
const meta = document.getElementById('meta');
if (meta) {
  meta.textContent = `${api.productName ?? 'EyeFlow Next'} · ${api.appId ?? 'app.eyeflow.next'}`;
}
