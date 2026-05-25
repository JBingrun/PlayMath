/* 設定頁（家長使用）：從主選單右上角齒輪進入 */
(function () {
  const $ = (id) => document.getElementById(id);
  const DEBUG_KEY = "playmath.debug";
  const isDebugOn = () => { try { return localStorage.getItem(DEBUG_KEY) === "1"; } catch { return false; } };
  function setDebug(on) {
    try { on ? localStorage.setItem(DEBUG_KEY, "1") : localStorage.removeItem(DEBUG_KEY); } catch {}
    document.body.classList.toggle("debug-on", !!on);
  }
  // 頁面載入時就套用
  document.addEventListener("DOMContentLoaded", () => {
    if (isDebugOn()) document.body.classList.add("debug-on");
  });
  window.PlayMathDebug = { isOn: isDebugOn, set: setDebug };

  function openSettings() {
    $("menuScreen").classList.remove("show");
    $("settingsScreen").classList.add("show");
    if (isDebugOn()) revealDebug();
  }

  function closeSettings() {
    $("settingsScreen").classList.remove("show");
    $("menuScreen").classList.add("show");
  }

  // 隱藏的 debug 區塊：標題連點 5 下開啟
  function setupDebugTap() {
    const title = document.querySelector("#settingsScreen .settings-title");
    if (!title) return;
    title.style.cursor = "pointer";
    title.style.userSelect = "none";
    let taps = 0, timer = null;
    title.addEventListener("click", () => {
      taps++;
      clearTimeout(timer);
      timer = setTimeout(() => { taps = 0; }, 1500);
      if (taps >= 5) {
        taps = 0;
        setDebug(true);
        revealDebug();
      }
    });
  }

  function revealDebug() {
    let section = document.getElementById("debugSection");
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "center" });
      section.classList.add("flash");
      setTimeout(() => section.classList.remove("flash"), 600);
      return;
    }
    const wrap = document.querySelector("#settingsScreen .settings-wrap");
    section = document.createElement("div");
    section.id = "debugSection";
    section.className = "settings-section debug-section";
    section.innerHTML = `
      <h3 class="settings-section-title">🛠 Debug 工具</h3>
      <p class="settings-hint">這個區塊是給開發者用的，請小心使用。</p>
      <div class="cal-backup">
        <button id="debugClearAll" class="settings-action-btn debug-danger">🗑 清除所有練習紀錄</button>
        <button id="debugOff" class="settings-action-btn">停用 Debug 模式</button>
      </div>
    `;
    wrap.appendChild(section);
    document.getElementById("debugClearAll").addEventListener("click", () => {
      if (!confirm("確定要清除所有練習紀錄嗎？此動作無法復原！")) return;
      window.PracticeStore?.clearAll();
      alert("✅ 已清除所有練習紀錄。");
    });
    document.getElementById("debugOff").addEventListener("click", () => {
      setDebug(false);
      section.remove();
    });
    section.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  document.addEventListener("DOMContentLoaded", () => {
    $("menuSettingsBtn").addEventListener("click", openSettings);
    $("settingsBack").addEventListener("click", closeSettings);
    setupDebugTap();
  });
})();
