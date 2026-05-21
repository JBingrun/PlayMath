/* 練習日曆頁面 */
(function () {
  const $ = (id) => document.getElementById(id);
  const MONTHS_TW = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];
  const WEEK_TW = ["週日", "週一", "週二", "週三", "週四", "週五", "週六"];

  let viewYear, viewMonth; // month: 0-based

  function renderCalendar() {
    const store = window.PracticeStore;
    $("calTitle").textContent = `${viewYear} 年 ${MONTHS_TW[viewMonth]}`;

    // 統計列
    const summary = store.monthSummary(viewYear, viewMonth);
    $("calStreak").textContent = store.streakDays();
    $("calMonthDays").textContent = summary.practicedDays;
    $("calAllCorrect").textContent = store.allTimeCorrect();

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
    const startWeekday = first.getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const days = store.load().days;
    const todayKey = store.todayKey();

    for (let i = 0; i < startWeekday; i++) {
      const blank = document.createElement("div");
      blank.className = "cal-cell empty";
      grid.appendChild(blank);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const rec = days[key];
      const correct = rec?.correct ?? 0;
      const cell = document.createElement("div");
      cell.className = "cal-cell";
      if (key === todayKey) cell.classList.add("today");
      if (correct > 0) cell.classList.add("done");
      cell.innerHTML = `
        <div class="cal-date">${d}</div>
        <div class="cal-stamp">${store.stampFor(correct)}</div>
        ${correct > 0 ? `<div class="cal-count">${correct} 題</div>` : ""}
      `;
      grid.appendChild(cell);
    }
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
