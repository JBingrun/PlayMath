/* 通用遊戲引擎：負責拖拉、組合方塊、橡皮擦、計分、勝利動畫。
 * 題型由外部傳入：需提供 { id, title, make(), buildEquation(eqEl, problem) }。
 * 題型回傳的 problem 物件需有 ans（正確答案）與 text（題目文字）。
 * 算式的對錯判定靠每個 .slot 的 data-expected 屬性。
 */

const PROBLEM_TYPES = window.PROBLEM_TYPES || [];

const state = {
  problem: null,
  type: null,
  correct: 0, wrong: 0, score: 0, streak: 0,
  bagPoints: 0,
  pendingCoins: 0,
  pendingBonus: 0,
};

const $ = (id) => document.getElementById(id);

function findNearestSlot(x, y, opts = {}) {
  const { numOnly = false, opOnly = false, maxDist = 60 } = opts;
  let best = null, bestDist = Infinity;
  document.querySelectorAll("#equation .slot").forEach((s) => {
    if (s.children.length) return;
    const isOp = s.classList.contains("op");
    if (numOnly && isOp) return;
    if (opOnly && !isOp) return;
    const r = s.getBoundingClientRect();
    const dx = Math.max(r.left - x, 0, x - r.right);
    const dy = Math.max(r.top  - y, 0, y - r.bottom);
    const edgeDist = Math.hypot(dx, dy);
    const d = edgeDist === 0 ? 0 : edgeDist;
    if (d < bestDist && d <= maxDist) { bestDist = d; best = s; }
  });
  return best;
}

/* ========== 拼塊托盤 ========== */
function buildDigitTray() {
  const tray = $("digitTray");
  tray.innerHTML = "";
  for (let i = 0; i <= 9; i++) {
    const d = document.createElement("div");
    d.className = "piece digit";
    d.dataset.value = String(i);
    d.dataset.type = "digit";
    d.textContent = i;
    tray.appendChild(d);
    d.addEventListener("pointerdown", startPieceDrag);
  }
}

function buildOpTray() {
  const tray = $("opTray");
  tray.innerHTML = "";
  ["+", "−", "×", "÷"].forEach(op => {
    const p = document.createElement("div");
    p.className = "piece op";
    p.dataset.value = op;
    p.dataset.type = "op";
    p.textContent = op;
    tray.appendChild(p);
    p.addEventListener("pointerdown", startPieceDrag);
  });
}

/* ========== 拼塊拖拉 ========== */
function startPieceDrag(e) {
  if (eraserOn) { notifyEraserBlocking(); return; }
  e.preventDefault();
  const src = e.currentTarget;
  const value = src.dataset.value;
  const type = src.dataset.type;
  const rect = src.getBoundingClientRect();
  const offX = e.clientX - rect.left;
  const offY = e.clientY - rect.top;

  const clone = src.cloneNode(true);
  clone.classList.add("clone");
  clone.style.width = rect.width + "px";
  clone.style.height = rect.height + "px";
  clone.style.left = (e.clientX - offX) + "px";
  clone.style.top = (e.clientY - offY) + "px";
  document.body.appendChild(clone);

  function clearHover() {
    document.querySelectorAll(".slot.hover, .combo-block.hover")
      .forEach(s => s.classList.remove("hover"));
  }
  function findTarget(x, y) {
    clone.style.visibility = "hidden";
    const el = document.elementFromPoint(x, y);
    clone.style.visibility = "";
    const combo = el?.closest(".combo-block");
    let slot = el?.closest(".slot");
    if (!slot && !combo) {
      slot = findNearestSlot(x, y, type === "op" ? { opOnly: true } : { numOnly: true });
    }
    return { slot, combo };
  }

  function onMove(ev) {
    ev.preventDefault();
    clone.style.left = (ev.clientX - offX) + "px";
    clone.style.top = (ev.clientY - offY) + "px";
    clearHover();
    const { slot, combo } = findTarget(ev.clientX, ev.clientY);
    if (type === "digit" && combo) combo.classList.add("hover");
    else if (slot && !slot.children.length) {
      const slotKind = slot.classList.contains("op") ? "op" : "num";
      if (slotKind === (type === "op" ? "op" : "num")) slot.classList.add("hover");
    }
  }

  function onUp(ev) {
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerup", onUp);
    document.removeEventListener("pointercancel", onUp);
    clearHover();
    const { slot, combo } = findTarget(ev.clientX, ev.clientY);

    if (type === "digit" && combo && !combo.classList.contains("placed")) {
      addDigitToCombo(combo, value);
      clone.remove();
      return;
    }

    if (slot && !slot.children.length) {
      const slotKind = slot.classList.contains("op") ? "op" : "num";
      const pieceKind = type === "op" ? "op" : "num";
      if (slotKind === pieceKind) {
        clone.classList.remove("clone");
        clone.classList.add("placed");
        clone.style.position = "";
        clone.style.left = clone.style.top = "";
        clone.style.width = clone.style.height = "";
        clone.dataset.value = value;
        slot.appendChild(clone);
        slot.classList.add("filled");
        checkComplete();
        return;
      }
      clone.remove();
      showFeedback(slotKind === "op" ? "這格要放運算符號喔" : "這格要放數字喔", "hint");
      return;
    }

    clone.remove();
  }

  document.addEventListener("pointermove", onMove);
  document.addEventListener("pointerup", onUp);
  document.addEventListener("pointercancel", onUp);
}

/* ========== 組合方塊 ========== */
function addDigitToCombo(combo, digit) {
  if (combo.classList.contains("placed")) return;
  const cur = combo.dataset.digits;
  if (cur.length >= 3) { showFeedback("組合方塊最多放 3 個數字", "hint"); return; }
  if (cur.length === 0 && digit === "0") { showFeedback("第一個數字不能是 0 喔", "hint"); return; }
  combo.dataset.digits = cur + digit;
  combo.textContent = combo.dataset.digits;
  combo.classList.remove("empty");
  combo.classList.add("ready");
}

function clearCombo(combo) {
  if (combo.classList.contains("placed")) return;
  combo.dataset.digits = "";
  combo.textContent = "";
  combo.classList.remove("ready");
  combo.classList.add("empty");
}

function attachComboHandlers(combo) {
  combo.addEventListener("pointerdown", (e) => {
    if (eraserOn) { notifyEraserBlocking(); return; }
    if (!combo.classList.contains("ready")) return;
    if (combo.classList.contains("placed")) return;
    startComboDrag(e, combo);
  });
}

function startComboDrag(e, combo) {
  e.preventDefault();
  const value = combo.dataset.digits;
  const rect = combo.getBoundingClientRect();
  const offX = e.clientX - rect.left;
  const offY = e.clientY - rect.top;

  combo.style.width = rect.width + "px";
  combo.style.height = rect.height + "px";
  combo.style.position = "fixed";
  combo.style.left = (e.clientX - offX) + "px";
  combo.style.top = (e.clientY - offY) + "px";
  combo.style.zIndex = "1000";
  combo.classList.add("dragging");
  document.body.appendChild(combo);

  function clearHover() {
    document.querySelectorAll(".slot.hover").forEach(s => s.classList.remove("hover"));
  }
  function findSlot(x, y) {
    return findNearestSlot(x, y, { numOnly: true, maxDist: 80 });
  }
  function resetStyle() {
    combo.style.position = "";
    combo.style.left = combo.style.top = "";
    combo.style.width = combo.style.height = "";
    combo.style.zIndex = "";
    combo.classList.remove("dragging");
  }

  function onMove(ev) {
    ev.preventDefault();
    combo.style.left = (ev.clientX - offX) + "px";
    combo.style.top = (ev.clientY - offY) + "px";
    clearHover();
    const slot = findSlot(ev.clientX, ev.clientY);
    if (slot && !slot.children.length && !slot.classList.contains("op"))
      slot.classList.add("hover");
  }

  function onUp(ev) {
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerup", onUp);
    document.removeEventListener("pointercancel", onUp);
    clearHover();
    const slot = findSlot(ev.clientX, ev.clientY);

    if (slot && !slot.children.length && !slot.classList.contains("op")) {
      resetStyle();
      combo.dataset.value = value;
      combo.classList.add("placed");
      slot.appendChild(combo);
      slot.classList.add("filled");
      spawnNewComboBlock();
      checkComplete();
    } else {
      resetStyle();
      const area = $("comboArea");
      area.insertBefore(combo, $("comboClear"));
      if (slot && slot.classList.contains("op")) {
        showFeedback("這格要放運算符號喔", "hint");
      } else if (!slot) {
        showFeedback("把組合方塊拖到算式裡的數字格子上 🎯", "hint");
      }
    }
  }

  document.addEventListener("pointermove", onMove);
  document.addEventListener("pointerup", onUp);
  document.addEventListener("pointercancel", onUp);
}

function spawnNewComboBlock() {
  const area = $("comboArea");
  const combo = document.createElement("div");
  combo.className = "combo-block empty";
  combo.id = "comboBlock";
  combo.dataset.digits = "";
  area.insertBefore(combo, $("comboClear"));
  attachComboHandlers(combo);
}

/* ========== 完成檢查 / 送出 ========== */
function checkComplete() {
  const slots = document.querySelectorAll("#equation .slot");
  if (eraserOn) slots.forEach(s => s.classList.toggle("erasable", s.children.length > 0));
  const allFilled = [...slots].every(s => s.children.length > 0);
  if (allFilled) {
    const input = $("answer");
    input.disabled = false;
    input.focus();
    showFeedback("👍 算式拼好了！算算看答案是多少", "hint");
  }
}

function getSlotValue(slot) {
  const child = slot.firstElementChild;
  if (!child) return null;
  return child.dataset.value ?? child.textContent;
}

function validateEquation() {
  const slots = document.querySelectorAll("#equation .slot");
  const wrong = [];
  slots.forEach((s) => {
    if (getSlotValue(s) !== s.dataset.expected) wrong.push(s);
  });
  return wrong;
}

function submitAnswer() {
  const input = $("answer");
  if (input.disabled) { showFeedback("先把算式拼完整再算答案唷！", "hint"); return; }
  const val = parseInt(input.value, 10);
  if (Number.isNaN(val)) { showFeedback("請輸入答案數字", "hint"); return; }
  const wrongSlots = validateEquation();
  if (wrongSlots.length) {
    state.wrong++; state.streak = 0;
    state.score = Math.max(0, state.score - 2);
    wrongSlots.forEach((s) => {
      s.classList.add("shake");
      setTimeout(() => s.classList.remove("shake"), 500);
    });
    showFeedback("❌ 算式有地方放錯囉！用橡皮擦清掉再試試 🧽", "wrong");
    updateStats();
    return;
  }
  if (val === state.problem.ans) {
    state.correct++; state.streak++;
    const bonus = state.streak >= 3 ? 5 : 0;
    state.score += 10 + bonus;
    queueBagPoints();
    window.PracticeStore?.recordResult(true, state.type?.id, state.type?.title);
    showVictory(10 + bonus);
  } else {
    state.wrong++; state.streak = 0;
    state.score = Math.max(0, state.score - 2);
    window.PracticeStore?.recordResult(false, state.type?.id, state.type?.title);
    showFeedback("不太對喔，再想想！", "wrong");
  }
  updateStats();
}

function newQuestion() {
  state.problem = state.type.make();
  $("questionText").textContent = state.problem.text;
  state.type.buildEquation($("equation"), state.problem);
  bindAnswerInput();
  resetWorkspace();
  if (eraserOn) setEraser(false);
  showFeedback("", "");
}

function bindAnswerInput() {
  const input = $("answer");
  if (!input) return;
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); input.blur(); }
  });
}

function resetWorkspace() {
  const area = $("comboArea");
  area.innerHTML = `
    <span class="combo-label">組合方塊：</span>
    <div class="combo-block empty" id="comboBlock" data-digits=""></div>
    <button class="combo-clear" id="comboClear" title="清除">✕</button>
  `;
  attachComboHandlers($("comboBlock"));
  $("comboClear").addEventListener("click", () => clearCombo($("comboBlock")));
}

function showFeedback(text, cls) {
  const f = $("feedback");
  f.textContent = text;
  f.className = "feedback " + cls;
}
function updateStats() {
  $("correctCount").textContent = state.correct;
  $("wrongCount").textContent = state.wrong;
  $("score").textContent = state.score;
  $("streak").textContent = state.streak;
}

/* ========== 答對動畫 ========== */
const PRAISES = ["很棒，你超厲害！", "太強了，繼續加油！", "答對了，你是數學小天才！", "厲害！再來一題！", "完美！你做得很好！"];
function showVictory(points) {
  $("victorySub").textContent = `+${points} 分 · ${PRAISES[Math.floor(Math.random()*PRAISES.length)]}`;
  document.body.classList.add("celebrating");
  $("victory").classList.add("show");
  updateStats();
  flushPendingCoins();
}
function hideVictory() {
  document.body.classList.remove("celebrating");
  $("victory").classList.remove("show");
}

/* ========== 橡皮擦 ========== */
let eraserOn = false;
function notifyEraserBlocking() {
  const btn = $("eraserBtn");
  btn.classList.remove("shake");
  void btn.offsetWidth;
  btn.classList.add("shake");
  setTimeout(() => btn.classList.remove("shake"), 400);
  showFeedback("要先關掉橡皮擦才能拖動方塊喔 🧽", "hint");
}
function setEraser(on) {
  eraserOn = on;
  $("eraserBtn").classList.toggle("active", on);
  document.querySelectorAll("#equation .slot").forEach((s) => {
    s.classList.toggle("erasable", on && s.children.length > 0);
  });
  if (on) showFeedback("🧽 橡皮擦開啟中：點算式裡的格子可以清掉", "hint");
  else showFeedback("", "");
}
function eraseSlot(slot) {
  if (!slot.children.length) return;
  const child = slot.firstElementChild;
  child.remove();
  slot.classList.remove("filled", "erasable");
  const input = $("answer");
  if (input) { input.disabled = true; input.value = ""; }
}
document.addEventListener("pointerdown", (e) => {
  if (!eraserOn) return;
  const slot = e.target.closest("#equation .slot");
  if (!slot) return;
  e.stopPropagation();
  e.preventDefault();
  if (slot.children.length) eraseSlot(slot);
}, true);

/* ========== 選單 / 切換頁面 ========== */
function buildMenu() {
  const list = $("menuList");
  const calBtn = $("menuCalendarBtn");
  // 清除舊卡片，保留 calendar 按鈕
  list.querySelectorAll(".menu-card").forEach(el => el.remove());
  PROBLEM_TYPES.forEach((type) => {
    const btn = document.createElement("button");
    btn.className = "menu-card";
    btn.innerHTML = `
      <div class="menu-emoji">${type.emoji ?? "🎲"}</div>
      <div class="menu-title">${type.title}</div>
      <div class="menu-desc">${type.description ?? ""}</div>
    `;
    btn.addEventListener("click", () => startGame(type));
    list.insertBefore(btn, calBtn);
  });
}

function startGame(type) {
  state.type = type;
  state.correct = 0; state.wrong = 0; state.score = 0; state.streak = 0;
  state.bagPoints = 0; state.pendingCoins = 0; state.pendingBonus = 0;
  updateBag();
  updateStats();
  $("menuScreen").classList.remove("show");
  $("gameScreen").classList.add("show");
  $("gameTitle").textContent = `${type.emoji ?? ""} ${type.title}`;
  document.title = type.title;
  newQuestion();
}

function backToMenu() {
  $("gameScreen").classList.remove("show");
  $("menuScreen").classList.add("show");
  hideVictory();
  if (eraserOn) setEraser(false);
}

/* ========== 點數收集袋 ========== */
function updateBag() {
  const el = $("pointsBagCount");
  if (el) el.textContent = state.bagPoints;
}
function queueBagPoints() {
  // 每答對一題基本 5 點；連對到 5 的倍數加贈 5 點（共 10 點）
  state.pendingCoins += 5;
  if (state.streak > 0 && state.streak % 5 === 0) state.pendingBonus += 5;
}
function flushPendingCoins() {
  const base = state.pendingCoins;
  const bonus = state.pendingBonus;
  state.pendingCoins = 0;
  state.pendingBonus = 0;
  if (base <= 0 && bonus <= 0) return;
  // 等下一題畫面 layout 穩定後再生成
  requestAnimationFrame(() => {
    spawnCoinsToBag(base, false);
    if (bonus > 0) setTimeout(() => spawnCoinsToBag(bonus, true), 250);
  });
}
function spawnCoinsToBag(count, isBonus) {
  const bag = $("pointsBag");
  if (!bag || count <= 0) return;
  const bagRect = bag.getBoundingClientRect();
  const targetX = bagRect.left + bagRect.width / 2;
  const targetY = bagRect.top + bagRect.height / 2;
  // 出生點：勝利卡片中央，沒顯示時退回題目區
  const victoryEl = document.querySelector("#victory.show .victory-card");
  const src = victoryEl || document.querySelector(".question-box") || document.body;
  const sRect = src.getBoundingClientRect();
  const startX = sRect.left + sRect.width / 2;
  const startY = sRect.top + sRect.height / 2;

  for (let i = 0; i < count; i++) {
    const coin = document.createElement("div");
    coin.className = "coin-fly" + (isBonus ? " bonus" : "");
    // 在起點周圍隨機散開一點
    const jitterX = (Math.random() - 0.5) * 80;
    const jitterY = (Math.random() - 0.5) * 40;
    const sx = startX + jitterX - 18;
    const sy = startY + jitterY - 18;
    coin.style.left = sx + "px";
    coin.style.top = sy + "px";
    coin.style.transform = "translate(0,0) scale(1.2)";
    document.body.appendChild(coin);

    const dx = targetX - (sx + 18);
    const dy = targetY - (sy + 18);
    const delay = i * 90;

    setTimeout(() => {
      coin.style.transform = `translate(${dx}px, ${dy}px) scale(0.5)`;
      coin.style.opacity = "0.2";
    }, delay + 20);

    setTimeout(() => {
      state.bagPoints += 1;
      updateBag();
      bag.classList.remove("bump");
      void bag.offsetWidth;
      bag.classList.add("bump");
      coin.remove();
    }, delay + 750);
  }
}

/* ========== 啟動 ========== */
$("eraserBtn").addEventListener("click", () => setEraser(!eraserOn));
$("victoryNext").addEventListener("click", () => { hideVictory(); newQuestion(); });
$("submitBtn").addEventListener("click", submitAnswer);
$("debugSkipBtn").addEventListener("click", () => {
  if (!state.problem) return;
  state.correct++; state.streak++;
  const bonus = state.streak >= 3 ? 5 : 0;
  state.score += 10 + bonus;
  queueBagPoints();
  window.PracticeStore?.recordResult(true, state.type?.id, state.type?.title);
  updateStats();
  showVictory(10 + bonus);
});
$("debugFailBtn").addEventListener("click", () => {
  if (!state.problem) return;
  state.wrong++; state.streak = 0;
  state.score = Math.max(0, state.score - 2);
  window.PracticeStore?.recordResult(false, state.type?.id, state.type?.title);
  updateStats();
  showFeedback("💥 Debug：已記為失敗", "wrong");
});
$("nextBtn").addEventListener("click", newQuestion);
$("resetBtn").addEventListener("click", () => {
  state.type.buildEquation($("equation"), state.problem);
  bindAnswerInput();
  resetWorkspace();
  showFeedback("", "");
});
$("backBtn").addEventListener("click", backToMenu);

buildDigitTray();
buildOpTray();
attachComboHandlers($("comboBlock"));
$("comboClear").addEventListener("click", () => clearCombo($("comboBlock")));
buildMenu();
