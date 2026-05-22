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

  function recordResult(isCorrect, typeId, typeTitle) {
    const data = load();
    const key = todayKey();
    const day = data.days[key] ?? { correct: 0, wrong: 0, types: {} };
    if (!day.types) day.types = {};
    if (isCorrect) day.correct++; else day.wrong++;
    if (typeId) {
      const t = day.types[typeId] ?? { title: typeTitle || typeId, correct: 0, wrong: 0 };
      if (typeTitle) t.title = typeTitle;
      if (isCorrect) t.correct++; else t.wrong++;
      day.types[typeId] = t;
    }
    data.days[key] = day;
    save(data);
  }

  // 取得指定日期所在週的週一（以週一為一週起始）
  function mondayOf(d) {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const dow = x.getDay(); // 0=Sun..6=Sat
    const diff = dow === 0 ? -6 : 1 - dow;
    x.setDate(x.getDate() + diff);
    return x;
  }

  function fmtKey(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  // 統計指定週一起算的七天紀錄，回傳各題型統計與建議
  function weekSummary(mondayDate) {
    const data = load();
    const types = {}; // id -> { title, correct, wrong }
    let totalCorrect = 0, totalWrong = 0, practicedDays = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(mondayDate);
      d.setDate(mondayDate.getDate() + i);
      const rec = data.days[fmtKey(d)];
      if (!rec) continue;
      if ((rec.correct ?? 0) + (rec.wrong ?? 0) > 0) practicedDays++;
      totalCorrect += rec.correct ?? 0;
      totalWrong += rec.wrong ?? 0;
      const dt = rec.types || {};
      Object.entries(dt).forEach(([id, v]) => {
        const t = types[id] ?? { title: v.title || id, correct: 0, wrong: 0 };
        t.title = v.title || t.title;
        t.correct += v.correct ?? 0;
        t.wrong += v.wrong ?? 0;
        types[id] = t;
      });
    }
    const typeList = Object.entries(types).map(([id, v]) => {
      const total = v.correct + v.wrong;
      return { id, title: v.title, correct: v.correct, wrong: v.wrong, total,
               errorRate: total ? v.wrong / total : 0 };
    });
    typeList.sort((a, b) => b.total - a.total);

    // 建議：錯誤率最高（至少做過 2 題以上），否則做題數最少的
    let suggest = null;
    const eligible = typeList.filter(t => t.total >= 2 && t.wrong > 0);
    if (eligible.length) {
      suggest = eligible.slice().sort((a, b) => b.errorRate - a.errorRate || b.wrong - a.wrong)[0];
    }
    return { totalCorrect, totalWrong, practicedDays, types: typeList, suggest };
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

  function exportJSON() {
    const data = load();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = todayKey().replace(/-/g, "");
    a.href = url;
    a.download = `playmath-history-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 100);
  }

  function importJSON(file, { merge = true } = {}) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const incoming = JSON.parse(reader.result);
          if (!incoming || typeof incoming !== "object" || !incoming.days) {
            reject(new Error("檔案格式不對"));
            return;
          }
          const current = load();
          const next = { days: { ...(merge ? current.days : {}) } };
          Object.entries(incoming.days).forEach(([k, v]) => {
            if (!v) return;
            if (merge && next.days[k]) {
              next.days[k] = {
                correct: (next.days[k].correct ?? 0) + (v.correct ?? 0),
                wrong:   (next.days[k].wrong   ?? 0) + (v.wrong   ?? 0),
              };
            } else {
              next.days[k] = { correct: v.correct ?? 0, wrong: v.wrong ?? 0 };
            }
          });
          save(next);
          resolve(next);
        } catch (e) { reject(e); }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }

  window.PracticeStore = {
    todayKey, load, recordResult, getMonth,
    streakDays, monthSummary, allTimeCorrect, stampFor,
    mondayOf, weekSummary,
    exportJSON, importJSON,
    clearAll: () => { try { localStorage.removeItem(KEY); } catch {} },
  };
})();
