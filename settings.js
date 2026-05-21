/* 設定頁（家長使用）：從主選單右上角齒輪進入 */
(function () {
  const $ = (id) => document.getElementById(id);

  function openSettings() {
    $("menuScreen").classList.remove("show");
    $("settingsScreen").classList.add("show");
  }

  function closeSettings() {
    $("settingsScreen").classList.remove("show");
    $("menuScreen").classList.add("show");
  }

  document.addEventListener("DOMContentLoaded", () => {
    $("menuSettingsBtn").addEventListener("click", openSettings);
    $("settingsBack").addEventListener("click", closeSettings);
  });
})();
