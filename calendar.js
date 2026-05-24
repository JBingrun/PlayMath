/* 練習紀錄頁面 */
(function () {
  const $ = (id) => document.getElementById(id);
  const MONTHS_TW = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];
  const WEEK_TW = ["週一", "週二", "週三", "週四", "週五", "週六", "週日"];

  let viewYear, viewMonth; // month: 0-based

  function renderCalendar() {
    const store = window.PracticeStore;
    $("calTitle").textContent = `${viewYear} 年 ${MONTHS_TW[viewMonth]}`;

    // 表格
    const grid = $("calGrid");
    grid.innerHTML = "";
    WEEK_TW.forEach((w) => {
      const h = document.createElement("div");
      h.className = "cal-weekhead";
      h.textContent = w;
      grid.appendChild(h);
    });

    const first = new Date(viewYear, viewMonth, 1);
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const last = new Date(viewYear, viewMonth, daysInMonth);
    const days = store.load().days;
    const todayKey = store.todayKey();

    // 以週一為起始，找出涵蓋本月第一天的那一週的週一
    const gridStart = store.mondayOf(first);

    // 一週一週渲染：週一~週日各一格；週日格同時是本週總結的入口（點擊開啟）
    let weekMonday = new Date(gridStart);
    for (let w = 0; w < 6; w++) {
      if (weekMonday > last) break;
      for (let i = 0; i < 7; i++) {
        const d = new Date(weekMonday);
        d.setDate(weekMonday.getDate() + i);
        if (i === 6) {
          appendSundayCell(grid, d, days, todayKey, new Date(weekMonday), store);
        } else {
          appendDayCell(grid, d, days, todayKey);
        }
      }
      weekMonday.setDate(weekMonday.getDate() + 7);
    }
  }

  function appendDayCell(grid, d, days, todayKey) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const inMonth = d.getMonth() === viewMonth;
    const rec = days[key];
    const correct = rec?.correct ?? 0;
    const cell = document.createElement("div");
    cell.className = "cal-cell";
    if (!inMonth) cell.classList.add("out");
    if (key === todayKey) cell.classList.add("today");
    if (correct > 0) cell.classList.add("done");
    const store = window.PracticeStore;
    cell.innerHTML = `
      <div class="cal-date">${d.getDate()}</div>
      <div class="cal-stamp">${store.stampFor(correct)}</div>
      ${correct > 0 ? `<div class="cal-count">${correct} 題</div>` : ""}
    `;
    grid.appendChild(cell);
  }

  function appendSundayCell(grid, d, days, todayKey, weekMonday, store) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const inMonth = d.getMonth() === viewMonth;
    const rec = days[key];
    const correct = rec?.correct ?? 0;
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "cal-cell cal-sunday";
    if (!inMonth) cell.classList.add("out");
    if (key === todayKey) cell.classList.add("today");
    if (correct > 0) cell.classList.add("done");
    cell.title = "點我看本週總結";
    cell.innerHTML = `
      <div class="cal-date">${d.getDate()}</div>
      <div class="cal-stamp">${store.stampFor(correct)}</div>
      ${correct > 0 ? `<div class="cal-count">${correct} 題</div>` : ""}
    `;
    cell.addEventListener("click", () => {
      const sum = store.weekSummary(weekMonday);
      openWeekSummaryModal(weekMonday, sum);
    });
    grid.appendChild(cell);
  }

  const PIE_COLORS = ["#ff6b9d", "#5c9ce6", "#ffb74d", "#9ccc65", "#ba68c8", "#4dd0e1", "#ffd54f", "#a1887f"];

  function buildPieSVG(types, size = 220) {
    const total = types.reduce((s, t) => s + t.total, 0) || 1;
    const cx = size / 2, cy = size / 2, r = size / 2 - 4;
    let angle = -Math.PI / 2; // 從 12 點方向開始
    const paths = types.map((t, i) => {
      const slice = (t.total / total) * Math.PI * 2;
      const x1 = cx + r * Math.cos(angle);
      const y1 = cy + r * Math.sin(angle);
      const next = angle + slice;
      const x2 = cx + r * Math.cos(next);
      const y2 = cy + r * Math.sin(next);
      const largeArc = slice > Math.PI ? 1 : 0;
      const color = PIE_COLORS[i % PIE_COLORS.length];
      let d;
      if (types.length === 1) {
        // 單一題型 → 整圓
        d = `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy} Z`;
      } else {
        d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
      }
      // 標籤位置（中點）
      const midAngle = angle + slice / 2;
      const labelR = r * 0.62;
      const lx = cx + labelR * Math.cos(midAngle);
      const ly = cy + labelR * Math.sin(midAngle);
      const pct = Math.round((t.total / total) * 100);
      angle = next;
      return { d, color, lx, ly, pct, t };
    });
    const slices = paths.map(p => `<path d="${p.d}" fill="${p.color}" stroke="#fff" stroke-width="2"></path>`).join("");
    const labels = paths.map(p =>
      p.pct >= 8 ? `<text x="${p.lx}" y="${p.ly}" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="bold" fill="#fff">${p.pct}%</text>` : ""
    ).join("");
    return { svg: `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">${slices}${labels}</svg>`, paths };
  }

  function fmtDate(d) {
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }

  function openWeekSummaryModal(weekMonday, sum) {
    const weekSunday = new Date(weekMonday);
    weekSunday.setDate(weekMonday.getDate() + 6);
    // 若該週沒有題型細節（舊資料），fallback 顯示答對/答錯比例
    let pieData = sum.types;
    let legacy = false;
    if (!pieData.length) {
      legacy = true;
      pieData = [
        { title: "答對", total: sum.totalCorrect, correct: sum.totalCorrect, wrong: 0 },
        { title: "答錯", total: sum.totalWrong, correct: 0, wrong: sum.totalWrong },
      ].filter(x => x.total > 0);
    }
    // 排序：失誤多的在上面（同失誤數則練習多的優先）
    const sorted = pieData.slice().sort((a, b) =>
      (b.wrong - a.wrong) || (b.total - a.total)
    );
    // 圓餅圖（依排序後順序配色，與長條圖色塊對應）
    const { svg, paths } = buildPieSVG(sorted);
    const colorByTitle = {};
    paths.forEach(p => { colorByTitle[p.t.title] = p.color; });
    const pieLegendHtml = paths.map(p => {
      const t = p.t;
      return `<div class="pie-legend-row">
        <span class="pie-swatch" style="background:${p.color}"></span>
        <span class="pie-legend-title">${escapeHtml(t.title)}</span>
        <span class="pie-legend-stats">${t.total} 題</span>
      </div>`;
    }).join("");

    const maxTotal = Math.max(...sorted.map(t => t.total), 1);
    const barsHtml = sorted.map(t => {
      const rate = t.total ? Math.round((t.correct / t.total) * 100) : 0;
      const errRate = t.total ? Math.round((t.wrong / t.total) * 100) : 0;
      const barWidthPct = (t.total / maxTotal) * 100;
      const correctPct = t.total ? (t.correct / t.total) * 100 : 0;
      const wrongPct  = t.total ? (t.wrong   / t.total) * 100 : 0;
      const highlight = (!legacy && t.wrong > 0 && t === sorted[0]) ? "highlight" : "";
      const dot = colorByTitle[t.title] || "#999";
      return `<div class="bar-row ${highlight}">
        <div class="bar-row-head">
          <span class="bar-title"><span class="bar-dot" style="background:${dot}"></span>${escapeHtml(t.title)}</span>
          <span class="bar-counts">
            <span class="bc-correct">✓ ${t.correct}</span>
            <span class="bc-wrong">✗ ${t.wrong}</span>
            <span class="bc-rate">正確率 ${rate}%</span>
          </span>
        </div>
        <div class="bar-track" style="width:${barWidthPct}%">
          <div class="bar-seg bar-correct" style="width:${correctPct}%" title="答對 ${t.correct}"></div>
          <div class="bar-seg bar-wrong" style="width:${wrongPct}%" title="答錯 ${t.wrong}"></div>
          ${t.wrong > 0 && wrongPct >= 12 ? `<span class="bar-err-label">失誤 ${errRate}%</span>` : ""}
        </div>
      </div>`;
    }).join("");
    const legacyNote = legacy
      ? `<div class="week-modal-legacy">ℹ️ 這週的紀錄是舊版本留下的，沒有題型細節。之後練習就會看到各題型佔比。</div>`
      : "";
    const suggestHtml = sum.suggest
      ? `<div class="week-modal-suggest">💡 建議加強：<b>${escapeHtml(sum.suggest.title)}</b>　失誤率 ${Math.round(sum.suggest.errorRate * 100)}%（${sum.suggest.wrong}/${sum.suggest.total} 題）</div>`
      : `<div class="week-modal-suggest ok">🎉 本週表現不錯，繼續保持！</div>`;

    let overlay = document.getElementById("weekModalOverlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "weekModalOverlay";
      overlay.className = "week-modal-overlay";
      document.body.appendChild(overlay);
    }
    overlay.innerHTML = `
      <div class="week-modal" role="dialog" aria-modal="true">
        <button type="button" class="week-modal-close" aria-label="關閉">✕</button>
        <h3 class="week-modal-title">本週練習總結</h3>
        <div class="week-modal-range">${fmtDate(weekMonday)} ~ ${fmtDate(weekSunday)}</div>
        <div class="week-modal-overview">練習 ${sum.practicedDays} 天 · 答對 ${sum.totalCorrect} 題 · 答錯 ${sum.totalWrong} 題</div>
        <div class="week-modal-body">
          <div class="week-modal-pie">${svg}</div>
          <div class="week-modal-legend">${pieLegendHtml}</div>
        </div>
        <div class="week-modal-section-title">各題型答對 / 答錯</div>
        <div class="week-modal-legend-tips">
          <span class="tip-item"><span class="tip-swatch tip-correct"></span>答對</span>
          <span class="tip-item"><span class="tip-swatch tip-wrong"></span>答錯</span>
          <span class="tip-note">長條長度 = 練習題數，紅色越長代表失誤越多</span>
        </div>
        <div class="week-modal-bars">${barsHtml}</div>
        ${legacyNote}
        ${suggestHtml}
      </div>
    `;
    overlay.classList.add("show");
    const close = () => overlay.classList.remove("show");
    overlay.querySelector(".week-modal-close").addEventListener("click", close);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    document.addEventListener("keydown", function onEsc(e) {
      if (e.key === "Escape") { close(); document.removeEventListener("keydown", onEsc); }
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  }

  function openCalendar() {
    const now = new Date();
    viewYear = now.getFullYear();
    viewMonth = now.getMonth();
    $("menuScreen").classList.remove("show");
    $("gameScreen").classList.remove("show");
    $("calendarScreen").classList.add("show");
    renderCalendar();
  }

  function closeCalendar() {
    $("calendarScreen").classList.remove("show");
    $("menuScreen").classList.add("show");
  }

  function shiftMonth(delta) {
    viewMonth += delta;
    if (viewMonth < 0) { viewMonth = 11; viewYear--; }
    else if (viewMonth > 11) { viewMonth = 0; viewYear++; }
    renderCalendar();
  }

  function goToday() {
    const now = new Date();
    viewYear = now.getFullYear();
    viewMonth = now.getMonth();
    renderCalendar();
  }

  window.PracticeCalendar = { openCalendar, closeCalendar, shiftMonth, goToday };

  document.addEventListener("DOMContentLoaded", () => {
    $("calBack").addEventListener("click", closeCalendar);
    $("calPrev").addEventListener("click", () => shiftMonth(-1));
    $("calNext").addEventListener("click", () => shiftMonth(1));
    $("calToday").addEventListener("click", goToday);
    $("menuCalendarBtn").addEventListener("click", openCalendar);

    $("calExport").addEventListener("click", () => {
      window.PracticeStore.exportJSON();
    });
    $("calImportFile").addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const merge = confirm("要合併現有紀錄嗎？\n\n按「確定」= 合併（兩邊資料相加）\n按「取消」= 覆蓋（清掉現有紀錄）");
      try {
        await window.PracticeStore.importJSON(file, { merge });
        renderCalendar();
        alert("✅ 匯入完成！");
      } catch (err) {
        alert("❌ 匯入失敗：" + err.message);
      } finally {
        e.target.value = "";
      }
    });
  });
})();
