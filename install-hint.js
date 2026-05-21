/* iOS Safari「加入主畫面」提示
 * 條件：是 iOS 裝置、用 Safari、尚未以 standalone 模式開啟、未被使用者關閉過。
 */
(function () {
  const DISMISS_KEY = "playmath.installHintDismissed.v1";

  function isIOS() {
    const ua = navigator.userAgent;
    if (/iPad|iPhone|iPod/.test(ua)) return true;
    // iPad iPadOS 13+ 會偽裝成 Mac
    return navigator.platform === "MacIntel" && (navigator.maxTouchPoints || 0) > 1;
  }

  function isSafari() {
    const ua = navigator.userAgent;
    if (/CriOS|FxiOS|EdgiOS|OPiOS|mercury/i.test(ua)) return false;
    return /Safari/.test(ua);
  }

  function isStandalone() {
    return window.navigator.standalone === true
        || window.matchMedia("(display-mode: standalone)").matches;
  }

  function shouldShow() {
    if (isStandalone()) return false;
    if (!isIOS() || !isSafari()) return false;
    try { if (localStorage.getItem(DISMISS_KEY) === "1") return false; } catch {}
    return true;
  }

  document.addEventListener("DOMContentLoaded", () => {
    const el = document.getElementById("installHint");
    if (!el) return;
    if (!shouldShow()) return;
    el.hidden = false;
    document.body.classList.add("with-install-hint");
    document.getElementById("installHintClose").addEventListener("click", () => {
      el.hidden = true;
      document.body.classList.remove("with-install-hint");
      try { localStorage.setItem(DISMISS_KEY, "1"); } catch {}
    });
  });
})();
