// PWA shell: SW registration, update toast with skip-waiting flow,
// Chromium install button, iOS install hint, standalone detection.

function $(id) { return document.getElementById(id); }

const els = {
  installBtn: $('installBtn'), installHint: $('installHint'),
  dismissInstallHint: $('dismissInstallHint'),
  updateToast: $('updateToast'), updateReloadBtn: $('updateReloadBtn')
};

let deferredPrompt = null;
let skipWaitingReloaded = false;

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
}

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function showUpdateToast() {
  els.updateToast.hidden = false;
}

export function initPWA() {
  // Hide all install UI when running standalone.
  if (isStandalone()) {
    els.installBtn.hidden = true;
    els.installHint.hidden = true;
    return;
  }

  // iOS install hint (once per device unless dismissed).
  if (isIOS() && navigator.standalone === false && !localStorage.getItem('daily-habit-log:installHintDismissed')) {
    els.installHint.hidden = false;
  }
  els.dismissInstallHint.addEventListener('click', () => {
    els.installHint.hidden = true;
    localStorage.setItem('daily-habit-log:installHintDismissed', '1');
  });

  // Chromium install button.
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    els.installBtn.hidden = false;
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    els.installBtn.hidden = true;
  });
  els.installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    deferredPrompt = null;
    els.installBtn.hidden = true;
  });

  // Service worker registration (after load, updateViaCache: 'none').
  function registerSW() {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('./sw.js', { scope: './', updateViaCache: 'none' }).then((reg) => {
      const checkWaiting = () => {
        if (!skipWaitingReloaded && reg.waiting && navigator.serviceWorker.controller) {
          showUpdateToast();
        }
      };
      reg.addEventListener('updatefound', () => {
        const worker = reg.installing;
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed') checkWaiting();
        });
      });
      checkWaiting();
    });
  }
  if (document.readyState === 'complete') registerSW();
  else window.addEventListener('load', registerSW);

  // controllerchange: the waiting worker took over -> reload (guarded against loops).
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (skipWaitingReloaded) { skipWaitingReloaded = false; return; }
    window.location.reload();
  });

  els.updateReloadBtn.addEventListener('click', () => {
    navigator.serviceWorker.ready.then((reg) => {
      if (reg.waiting) {
        skipWaitingReloaded = true;
        reg.waiting.postMessage('SKIP_WAITING');
      }
      window.location.reload();
    });
  });
}
