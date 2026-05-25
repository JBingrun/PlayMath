/* 練習紀錄頁面 */
(function () {
  const $ = (id) => document.getElementById(id);
  const MONTHS_TW = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];
  const WEEK_TW = ["週一", "週二", "週三", "週四", "週五", "週六", "週日"];

  let viewYear, viewMonth; // month: 0-based

  // 自訂印章 — 對應四個等級（形狀由 icons/shape_N.svg 透過 CSS mask 套用）
  function stampSvgFor(correct) {
    if (!correct) return "";
    let tier;
    if (correct >= 20) tier = 4;
    else if (correct >= 10) tier = 3;
    else if (correct >= 5)  tier = 2;
    else tier = 1;
    return `<span class="cal-stamp stamp-tier-${tier}" aria-hidden="true"></span>`;
  }

  function renderCalendar() {
    const store = window.PracticeStore;
    // 副標題 = 月份 + 描述
    const subtitle = $("calSubtitle");
    if (subtitle) {
      subtitle.textContent = `${viewYear} 年 ${MONTHS_TW[viewMonth]} · 紀錄每天練習的過程`;
    }
    // 今天按鈕：若不是當月，加上小標示
    const todayBtn = $("calToday");
    if (todayBtn) {
      const now = new Date();
      const isCurrent = (now.getFullYear() === viewYear && now.getMonth() === viewMonth);
      todayBtn.textContent = isCurrent ? "今天" : "回今天";
    }

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
    if (correct > 0) cell.classList.add("has-practice");
    cell.innerHTML = `
      <span class="cal-date">${d.getDate()}</span>
      ${stampSvgFor(correct)}
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
    if (correct > 0) cell.classList.add("has-practice");
    cell.title = "點我看本週總結";
    cell.innerHTML = `
      <span class="cal-date">${d.getDate()}</span>
      ${stampSvgFor(correct)}
    `;
    cell.addEventListener("click", () => {
      const sum = store.weekSummary(weekMonday);
      openWeekSummaryModal(weekMonday, sum);
    });
    grid.appendChild(cell);
  }

  const PIE_COLORS = ["#fdb8dd", "#b9d0f0", "#9eb16f", "#f5d76e", "#c9728b", "#a8c8e6", "#998c75", "#2a1f1c"];
  // 對應 PIE_COLORS 的深色版本（icon 用，在 bean 上看得清楚但是同色系）
  const PIE_COLORS_DARK = ["#b9457e", "#4d6e9c", "#5d7240", "#a8862e", "#5a2e3f", "#496481", "#5d543d", "#000000"];

  // 題型 → Lucide icon
  const TOPIC_ICONS = {
    twoStepPuzzle: "puzzle",
    diffTimes: "tag",
    changeBack: "wallet",
    twoGroupsAdd: "utensils",
    compareTwoGroups: "scale",
    timesCompare: "x",
    clockMinutes: "clock",
  };

  function buildRingSVG(types, size = 280) {
    const R = 90;                 // 環半徑
    const STROKE = 32;            // bean 厚度
    const GAP_DEG = 25;           // bean 間隙（度）
    const ICON_R = R;             // icon 在 bean 中央線上
    const cx = size / 2, cy = size / 2;

    const total = types.reduce((s, t) => s + t.total, 0) || 1;

    function polar(deg, r) {
      const rad = (deg - 90) * Math.PI / 180;
      return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
    }

    let cum = 0;
    // 先算每個 bean 的原始角度比例，再保證每個有 MIN_DEG 寬度（從大的那邊拿）
    const MIN_DEG = GAP_DEG + 6; // bean 最小可見寬度
    let raw = types.map((t, i) => ({
      t,
      deg: (t.total / total) * 360,
      color: PIE_COLORS[i % PIE_COLORS.length],
      iconColor: PIE_COLORS_DARK[i % PIE_COLORS_DARK.length],
    }));
    const small = raw.filter(r => r.deg < MIN_DEG);
    const stolen = small.reduce((s, r) => s + (MIN_DEG - r.deg), 0);
    small.forEach(r => r.deg = MIN_DEG);
    const big = raw.filter(r => r.deg > MIN_DEG);
    const totalBig = big.reduce((s, r) => s + r.deg, 0);
    if (big.length && stolen > 0 && totalBig > 0) {
      big.forEach(r => { r.deg -= stolen * (r.deg / totalBig); });
    }

    const beans = raw.map(r => {
      const sliceDeg = r.deg;
      const startDeg = cum + GAP_DEG / 2;
      const endDeg = cum + sliceDeg - GAP_DEG / 2;
      cum += sliceDeg;
      return {
        startDeg, endDeg,
        midDeg: (startDeg + endDeg) / 2,
        color: r.color,
        iconColor: r.iconColor,
        sliceDeg, t: r.t,
      };
    });

    // 單一題型 → 整圈（避免起終點重疊）
    const beansHtml = beans.map((b, i) => {
      if (b.sliceDeg <= GAP_DEG + 0.5) return "";
      if (beans.length === 1) {
        // 整圈用兩個半圓避免 startAngle=endAngle
        const [x1, y1] = polar(0, R);
        const [x2, y2] = polar(180, R);
        return `<path d="M ${x1} ${y1} A ${R} ${R} 0 0 1 ${x2} ${y2} A ${R} ${R} 0 0 1 ${x1} ${y1}" stroke="${b.color}" stroke-width="${STROKE}" fill="none"/>`;
      }
      const [x1, y1] = polar(b.startDeg, R);
      const [x2, y2] = polar(b.endDeg, R);
      const largeArc = (b.endDeg - b.startDeg) > 180 ? 1 : 0;
      return `<path d="M ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2}" stroke="${b.color}" stroke-width="${STROKE}" stroke-linecap="round" fill="none"/>`;
    }).join("");

    const svg = `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" class="ring-svg">
      ${beansHtml}
      <text x="${cx}" y="${cy + 8}" text-anchor="middle" font-size="56" font-weight="800" fill="#070401" font-variant-numeric="tabular-nums">${total}</text>
      <text x="${cx}" y="${cy + 36}" text-anchor="middle" font-size="13" fill="#998c75" font-weight="600">本週練習題數</text>
    </svg>`;

    // 環外側的 icon 浮層（絕對定位 HTML，方便用 Lucide）
    const iconsHtml = beans.map(b => {
      if (b.sliceDeg <= GAP_DEG + 0.5) return "";
      const iconName = TOPIC_ICONS[b.t.id] || "circle";
      const [ix, iy] = polar(b.midDeg, ICON_R);
      return `<div class="ring-icon-wrap" style="left:${ix}px;top:${iy}px;color:${b.iconColor};" title="${escapeHtml(b.t.title)}">
        <i data-lucide="${iconName}"></i>
      </div>`;
    }).join("");

    return { svg, iconsHtml: "", paths: beans, size };
  }

  function fmtDate(d) {
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }

  function openWeekSummaryModal(weekMonday, sum) {
    const weekSunday = new Date(weekMonday);
    weekSunday.setDate(weekMonday.getDate() + 6);

    let overlay = document.getElementById("weekModalOverlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "weekModalOverlay";
      overlay.className = "week-modal-overlay";
      document.body.appendChild(overlay);
    }

    // 若本週完全沒練習 → 顯示空狀態訊息
    const isEmpty = (sum.totalCorrect + sum.totalWrong) === 0;
    if (isEmpty) {
      overlay.innerHTML = `
        <div class="week-modal" role="dialog" aria-modal="true">
          <button type="button" class="week-modal-close" aria-label="關閉">✕</button>
          <h3 class="week-modal-title">本週練習總結</h3>
          <div class="week-modal-range">${fmtDate(weekMonday)} ~ ${fmtDate(weekSunday)}</div>
          <div class="week-modal-empty">
            <i data-lucide="moon" class="empty-icon"></i>
            <div class="empty-title">本週還沒有練習紀錄</div>
            <div class="empty-sub">挑一個題型開始練習吧</div>
          </div>
        </div>
      `;
      overlay.classList.add("show");
      if (window.lucide?.createIcons) window.lucide.createIcons();
      const close = () => overlay.classList.remove("show");
      overlay.querySelector(".week-modal-close").addEventListener("click", close);
      overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
      return;
    }

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
    // 環狀圖（依排序後順序配色，與長條圖色塊對應）
    const { svg, iconsHtml, paths, size: ringSize } = buildRingSVG(sorted);
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
        <div class="bar-track">
          <div class="bar-seg bar-correct" style="width:${correctPct}%" title="答對 ${t.correct}"></div>
          <div class="bar-seg bar-wrong" style="width:${wrongPct}%" title="答錯 ${t.wrong}"></div>
        </div>
      </div>`;
    }).join("");
    const legacyNote = legacy
      ? `<div class="week-modal-legacy"><i data-lucide="info" class="hint-icon"></i>這週的紀錄是舊版本留下的，沒有題型細節。之後練習就會看到各題型佔比。</div>`
      : "";
    const suggestHtml = sum.suggest
      ? `<div class="week-modal-suggest"><i data-lucide="lightbulb" class="hint-icon"></i>建議加強：<b>${escapeHtml(sum.suggest.title)}</b></div>`
      : `<div class="week-modal-suggest ok"><i data-lucide="party-popper" class="hint-icon"></i>本週表現不錯，繼續保持！</div>`;

    overlay.innerHTML = `
      <div class="week-modal" role="dialog" aria-modal="true">
        <button type="button" class="week-modal-close" aria-label="關閉">✕</button>
        <h3 class="week-modal-title">本週練習總結</h3>
        <div class="week-modal-range">${fmtDate(weekMonday)} ~ ${fmtDate(weekSunday)}</div>
        <div class="week-modal-overview">練習 ${sum.practicedDays} 天 · 答對 ${sum.totalCorrect} 題 · 答錯 ${sum.totalWrong} 題</div>
        <div class="week-modal-body">
          <div class="week-modal-pie">
            <div class="ring-wrap" style="width:${ringSize}px;height:${ringSize}px">
              ${svg}
              ${iconsHtml}
            </div>
          </div>
          <div class="week-modal-legend">${pieLegendHtml}</div>
        </div>
        <div class="week-modal-section-title">各題型答對 / 答錯</div>
        <div class="week-modal-legend-tips">
          <span class="tip-item"><span class="tip-swatch tip-correct"></span>答對</span>
          <span class="tip-item"><span class="tip-swatch tip-wrong"></span>答錯</span>
          <span class="tip-note">長條顯示此題型的答對 / 答錯比例</span>
        </div>
        <div class="week-modal-bars">${barsHtml}</div>
        ${legacyNote}
        ${suggestHtml}
      </div>
    `;
    overlay.classList.add("show");
    if (window.lucide?.createIcons) window.lucide.createIcons();
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
