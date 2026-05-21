/* 練習紀錄（localStorage）
 * 結構：{ days: { "YYYY-MM-DD": { correct, wrong } } }
 */
(function () {
  const KEY = "playmath.history.v1";

  function todayKey(d = new Date()) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return { days: {} };
      const data = JSON.parse(raw);
      return data && data.days ? data : { days: {} };
    } catch { return { days: {} }; }
  }

  function save(data) {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {}
  }

  function recordResult(isCorrect) {
    const data = load();
    const key = todayKey();
    const day = data.days[key] ?? { correct: 0, wrong: 0 };
    if (isCorrect) day.correct++; else day.wrong++;
    data.days[key] = day;
    save(data);
  }

  function getMonth(year, month) {
    return load().days;
  }

  // 連續練習天數（從今天往回，遇到沒練習就停）
  function streakDays() {
    const data = load();
    let count = 0;
    const d = new Date();
    while (true) {
      const k = todayKey(d);
      if ((data.days[k]?.correct ?? 0) > 0) {
        count++;
        d.setDate(d.getDate() - 1);
      } else break;
    }
    return count;
  }

  function monthSummary(year, month /* 0-based */) {
    const data = load();
    let practicedDays = 0, totalCorrect = 0;
    Object.entries(data.days).forEach(([k, v]) => {
      const [y, m] = k.split("-").map(Number);
      if (y === year && m - 1 === month) {
        if ((v.correct ?? 0) > 0) practicedDays++;
        totalCorrect += v.correct ?? 0;
      }
    });
    return { practicedDays, totalCorrect };
  }

  function allTimeCorrect() {
    const data = load();
    return Object.values(data.days).reduce((s, v) => s + (v.correct ?? 0), 0);
  }

  // 依答對數回傳成長章圖示
  function stampFor(correct) {
    if (!correct) return "";
    if (correct >= 20) return "🏆";
    if (correct >= 10) return "🌳";
    if (correct >= 5)  return "🌿";
    return "🌱";
  }

  window.PracticeStore = {
    todayKey, load, recordResult, getMonth,
    streakDays, monthSummary, allTimeCorrect, stampFor,
  };
})();
