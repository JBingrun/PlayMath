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
  timerStartAt: 0,
  timerInterval: null,
  timerPhase: "bonus", // "bonus" | "normal" | "timeout"
};

/* 金幣總數持久化 */
const BAG_KEY = "playmath.bag.v1";
function loadBagPoints() {
  try {
    const v = parseInt(localStorage.getItem(BAG_KEY), 10);
    return Number.isFinite(v) && v >= 0 ? v : 0;
  } catch (e) { return 0; }
}
function saveBagPoints(v) {
  try { localStorage.setItem(BAG_KEY, String(v)); } catch (e) {}
}
state.bagPoints = loadBagPoints();

const TIMER_BONUS_MS = 60 * 1000;
const TIMER_LIMIT_MS = 3 * 60 * 1000;

function startQuestionTimer() {
  stopQuestionTimer();
  state.timerStartAt = performance.now();
  state.timerPhase = "bonus";
  updateTimerUI(0);
  state.timerInterval = setInterval(() => {
    const elapsed = performance.now() - state.timerStartAt;
    updateTimerUI(elapsed);
    if (elapsed >= TIMER_LIMIT_MS && state.timerPhase !== "timeout") {
      state.timerPhase = "timeout";
      updateTimerUI(TIMER_LIMIT_MS);
      clearInterval(state.timerInterval);
      state.timerInterval = null;
      showFeedback("⏰ 時間到！答對只能拿 1 分囉", "hint");
    }
  }, 200);
}
function stopQuestionTimer() {
  if (state.timerInterval) { clearInterval(state.timerInterval); state.timerInterval = null; }
}
function getElapsedMs() {
  if (!state.timerStartAt) return 0;
  return performance.now() - state.timerStartAt;
}
function updateTimerUI(elapsed) {
  const bar = $("timerBar");
  const fill = $("timerFill");
  const text = $("timerText");
  const handMin = document.getElementById("timerHandMin");
  const handSec = document.getElementById("timerHandSec");
  if (!bar || !fill || !text) return;
  const remain = Math.max(0, TIMER_LIMIT_MS - elapsed);
  const ratio = remain / TIMER_LIMIT_MS;
  fill.style.width = (ratio * 100) + "%";
  const remainSec = Math.ceil(remain / 1000);
  const m = Math.floor(remainSec / 60);
  const s = remainSec % 60;
  text.textContent = `${m}:${String(s).padStart(2, "0")}`;
  let phase = "normal";
  if (elapsed >= TIMER_LIMIT_MS) phase = "timeout";
  else if (elapsed < TIMER_BONUS_MS) phase = "bonus";
  state.timerPhase = phase;
  bar.dataset.phase = phase;
  if (handMin && handSec) {
    const cx = 24, cy = 24;
    // 分針：3 分鐘轉一圈
    const minAngle = (elapsed / TIMER_LIMIT_MS) * Math.PI * 2 - Math.PI / 2;
    const mr = 6;
    handMin.setAttribute("x2", (cx + Math.cos(minAngle) * mr).toFixed(2));
    handMin.setAttribute("y2", (cy + Math.sin(minAngle) * mr).toFixed(2));
    // 秒針：每分鐘轉一圈
    const secAngle = ((elapsed % 60000) / 60000) * Math.PI * 2 - Math.PI / 2;
    const sr = 11;
    handSec.setAttribute("x2", (cx + Math.cos(secAngle) * sr).toFixed(2));
    handSec.setAttribute("y2", (cy + Math.sin(secAngle) * sr).toFixed(2));
  }
}

const $ = (id) => document.getElementById(id);

function findNearestSlot(x, y, opts = {}) {
  const { numOnly = false, opOnly = false, maxDist = 60, includeCarry = false } = opts;
  let best = null, bestDist = Infinity;
  const sel = includeCarry ? "#equation .slot" : "#equation .slot:not(.carry-slot)";
  document.querySelectorAll(sel).forEach((s) => {
    const isCarry = s.classList.contains("carry-slot");
    // carry-slot：只接受數字、可被覆寫，所以不檢查 slotHasPiece
    if (!isCarry && slotHasPiece(s)) return;
    const isOp = s.classList.contains("op");
    if (numOnly && isOp) return;
    if (opOnly && isOp === false && !isCarry) return; // op 拼塊不能進 carry
    if (opOnly && isCarry) return;
    const r = s.getBoundingClientRect();
    const dx = Math.max(r.left - x, 0, x - r.right);
    const dy = Math.max(r.top  - y, 0, y - r.bottom);
    const edgeDist = Math.hypot(dx, dy);
    if (edgeDist < bestDist && edgeDist <= maxDist) { bestDist = edgeDist; best = s; }
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

  // carry-slot 預覽狀態
  let prevCarry = null;
  function clearCarryPreview() {
    if (!prevCarry) return;
    prevCarry.classList.remove("carry-preview");
    prevCarry.textContent = prevCarry.dataset.value || "";
    prevCarry = null;
  }

  function clearHover() {
    document.querySelectorAll(".slot.hover, .combo-block.hover")
      .forEach(s => s.classList.remove("hover"));
  }
  function findTarget(x, y) {
    clone.style.visibility = "hidden";
    const el = document.elementFromPoint(x, y);
    clone.style.visibility = clone.classList.contains("hide-on-carry") ? "hidden" : "";
    const combo = el?.closest(".combo-block");
    let slot = el?.closest(".slot");
    // carry-slot 只接受數字、需直接命中
    if (slot && slot.classList.contains("carry-slot")) {
      if (type !== "digit") slot = null;
    } else if (!slot && !combo) {
      slot = findNearestSlot(x, y, type === "op" ? { opOnly: true } : { numOnly: true, includeCarry: true });
    }
    return { slot, combo };
  }

  function onMove(ev) {
    ev.preventDefault();
    clone.style.left = (ev.clientX - offX) + "px";
    clone.style.top = (ev.clientY - offY) + "px";
    clearHover();
    const { slot, combo } = findTarget(ev.clientX, ev.clientY);

    // 處理 carry-slot 預覽
    const targetCarry = (type === "digit" && slot && slot.classList.contains("carry-slot")) ? slot : null;
    if (prevCarry && prevCarry !== targetCarry) clearCarryPreview();
    if (targetCarry && targetCarry !== prevCarry) {
      // 進入新 carry-slot — 設預覽
      targetCarry.classList.add("carry-preview");
      targetCarry.textContent = value;
      prevCarry = targetCarry;
    }
    clone.classList.toggle("hide-on-carry", !!targetCarry);
    clone.style.visibility = targetCarry ? "hidden" : "";

    if (type === "digit" && combo) combo.classList.add("hover");
    else if (slot && !slot.classList.contains("carry-slot") && !slotHasPiece(slot)) {
      const slotKind = slot.classList.contains("op") ? "op" : "num";
      if (slotKind === (type === "op" ? "op" : "num")) slot.classList.add("hover");
    } else if (targetCarry) {
      targetCarry.classList.add("hover");
    }
  }

  function onUp(ev) {
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerup", onUp);
    document.removeEventListener("pointercancel", onUp);
    clearHover();
    const { slot, combo } = findTarget(ev.clientX, ev.clientY);

    // carry-slot：直接填入文字（不放 piece），允許覆蓋
    if (type === "digit" && slot && slot.classList.contains("carry-slot")) {
      slot.classList.remove("carry-preview");
      slot.dataset.value = value;
      slot.textContent = value;
      slot.classList.add("filled");
      clone.remove();
      return;
    }
    // 沒落在 carry-slot → 還原任何預覽
    clearCarryPreview();

    if (type === "digit" && combo && !combo.classList.contains("placed")) {
      addDigitToCombo(combo, value);
      clone.remove();
      return;
    }

    if (slot && !slotHasPiece(slot)) {
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
    return findNearestSlot(x, y, { numOnly: true, maxDist: 80, includeCarry: true });
  }
  function resetStyle() {
    combo.style.position = "";
    combo.style.left = combo.style.top = "";
    combo.style.width = combo.style.height = "";
    combo.style.zIndex = "";
    combo.classList.remove("dragging");
  }

  // carry-slot 預覽
  let prevCarry = null;
  function clearCarryPreview() {
    if (!prevCarry) return;
    prevCarry.classList.remove("carry-preview");
    prevCarry.textContent = prevCarry.dataset.value || "";
    prevCarry = null;
  }

  function onMove(ev) {
    ev.preventDefault();
    combo.style.left = (ev.clientX - offX) + "px";
    combo.style.top = (ev.clientY - offY) + "px";
    clearHover();
    const slot = findSlot(ev.clientX, ev.clientY);
    const isCarry = slot && slot.classList.contains("carry-slot");

    // carry-slot 預覽
    if (prevCarry && prevCarry !== slot) clearCarryPreview();
    if (isCarry && slot !== prevCarry) {
      slot.classList.add("carry-preview");
      slot.textContent = value;
      prevCarry = slot;
    }
    combo.style.visibility = isCarry ? "hidden" : "";

    if (isCarry) {
      slot.classList.add("hover");
    } else if (slot && !slotHasPiece(slot) && !slot.classList.contains("op")) {
      slot.classList.add("hover");
    }
  }

  function onUp(ev) {
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerup", onUp);
    document.removeEventListener("pointercancel", onUp);
    clearHover();
    combo.style.visibility = "";
    const slot = findSlot(ev.clientX, ev.clientY);

    // carry-slot：寫入文字、不消耗 combo
    if (slot && slot.classList.contains("carry-slot")) {
      slot.classList.remove("carry-preview");
      slot.dataset.value = value;
      slot.textContent = value;
      slot.classList.add("filled");
      resetStyle();
      const area = $("comboArea");
      area.insertBefore(combo, $("comboClear"));
      return;
    }
    clearCarryPreview();

    if (slot && !slotHasPiece(slot) && !slot.classList.contains("op")) {
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
// 忽略 dashed-borders.js 注入的 SVG 邊框，取得 slot 裡的 piece / combo-block
function slotPiece(slot) {
  for (const child of slot.children) {
    if (child.tagName === "svg" && child.classList.contains("dash-frame")) continue;
    return child;
  }
  return null;
}
function slotHasPiece(slot) { return !!slotPiece(slot); }

function checkComplete() {
  const slots = document.querySelectorAll("#equation .slot:not(.carry-slot)");
  if (eraserOn) slots.forEach(s => s.classList.toggle("erasable", slotHasPiece(s)));
  const allFilled = [...slots].every(s => slotHasPiece(s));
  if (allFilled) {
    const input = $("answer");
    input.disabled = false;
    input.focus();
    showFeedback("👍 算式拼好了！算算看答案是多少", "hint");
  }
}

function getSlotValue(slot) {
  const child = slotPiece(slot);
  if (!child) return null;
  return child.dataset.value ?? child.textContent;
}

function validateEquation() {
  const slots = document.querySelectorAll("#equation .slot[data-expected]");
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
    stopQuestionTimer();
    const elapsed = getElapsedMs();
    const timedOut = elapsed >= TIMER_LIMIT_MS;
    const doubled = !timedOut && elapsed < TIMER_BONUS_MS;
    state.correct++; state.streak++;
    let gained;
    if (timedOut) {
      gained = 1;
      state.score += gained;
    } else {
      const bonus = state.streak >= 3 ? 5 : 0;
      gained = (10 + bonus) * (doubled ? 2 : 1);
      state.score += gained;
    }
    queueBagPoints({ doubled, timedOut });
    window.PracticeStore?.recordResult(true, state.type?.id, state.type?.title);
    showVictory(gained, { doubled, timedOut });
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
  renderQuestionText(state.problem.text);
  state.type.buildEquation($("equation"), state.problem);
  bindAnswerInput();
  resetWorkspace();
  if (eraserOn) setEraser(false);
  showFeedback("", "");
  startQuestionTimer();
}

/* emoji → lucide icon 名稱對照（kebab-case） */
const EMOJI_TO_LUCIDE = {
  "🍩": "donut", "📚": "library", "🍎": "apple",
  "🚗": "car", "🐠": "fish", "🐟": "fish",
  "🍪": "cookie", "🍰": "cake-slice", "🎈": "party-popper",
  "🍊": "citrus", "📦": "package", "🥤": "cup-soda",
  "🍌": "banana", "🧃": "milk", "🥨": "croissant",
  "💰": "wallet", "🥟": "soup", "🍭": "candy",
  "🥚": "egg", "🧋": "cup-soda", "🍗": "drumstick",
  "🍕": "pizza", "🍦": "ice-cream-cone", "📒": "notebook-pen",
  "🧁": "cake", "🍙": "utensils", "🎟": "ticket", "🎟️": "ticket",
  "🪙": "coins", "🃏": "spade", "⭐": "star",
  "🕐": "clock", "⏰": "alarm-clock", "🧭": "compass",
  "🧩": "puzzle",
  "🧽": "eraser", "👍": "thumbs-up", "🎯": "target",
  "⚡": "zap", "❌": "x", "💥": "x-circle",
};
const EMOJI_RX = new RegExp(Object.keys(EMOJI_TO_LUCIDE).join("|"), "g");

function emojiToLucideHTML(text, klass) {
  return text.replace(EMOJI_RX, (m) => {
    const name = EMOJI_TO_LUCIDE[m];
    return `<i data-lucide="${name}" class="${klass}"></i>`;
  });
}

function renderQuestionText(text) {
  const el = $("questionText");
  el.innerHTML = emojiToLucideHTML(text, "q-icon");
  if (window.lucide?.createIcons) window.lucide.createIcons();
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

let feedbackTimer = null;
function showFeedback(text, cls) {
  const f = $("feedback");
  if (!f) return;
  clearTimeout(feedbackTimer);
  feedbackTimer = null;

  if (!text) {
    f.classList.remove("show");
    return;
  }

  // 已在顯示中 → 瞬間消失再滑入
  if (f.classList.contains("show")) {
    f.style.transition = "none";
    f.classList.remove("show");
    void f.offsetWidth; // 強制 reflow
    f.style.transition = "";
  }

  f.innerHTML = emojiToLucideHTML(text, "fb-icon");
  f.classList.remove("correct", "wrong", "hint");
  if (cls) f.classList.add(cls);

  // 強制瀏覽器先 commit「未顯示」的起始樣式（opacity 0 / translateX -40px），
  // 第一次顯示才會有滑入動畫。
  void f.offsetWidth;

  requestAnimationFrame(() => {
    f.classList.add("show");
    if (window.lucide?.createIcons) window.lucide.createIcons();
  });

  // 3 秒後自動消失
  feedbackTimer = setTimeout(() => {
    f.classList.remove("show");
    feedbackTimer = null;
  }, 3000);
}
function updateStats() {
  $("correctCount").textContent = state.correct;
  $("wrongCount").textContent = state.wrong;
  const scoreEl = $("score");
  if (scoreEl) scoreEl.textContent = state.score;
  $("streak").textContent = state.streak;
}

/* ========== 答對動畫 ========== */
const PRAISES = ["很棒，你超厲害！", "太強了，繼續加油！", "答對了，你是數學小天才！", "厲害！再來一題！", "完美！你做得很好！"];
function showVictory(points, opts = {}) {
  const { doubled = false, timedOut = false } = opts;
  let prefix = "";
  if (doubled) prefix = "⚡ 2 倍 ";
  else if (timedOut) prefix = "⏰ 時間到 ";
  const subText = `${prefix}+${points} 分 · ${PRAISES[Math.floor(Math.random()*PRAISES.length)]}`;
  $("victorySub").innerHTML = emojiToLucideHTML(subText, "victory-sub-icon");
  document.body.classList.add("celebrating");
  $("victory").classList.add("show");
  if (window.lucide?.createIcons) window.lucide.createIcons();
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
  document.querySelectorAll("#equation .slot[data-expected]").forEach((s) => {
    s.classList.toggle("erasable", on && slotHasPiece(s));
  });
  document.querySelectorAll("#equation .carry-slot").forEach((s) => {
    s.classList.toggle("erasable", on && s.classList.contains("filled"));
  });
  if (on) showFeedback("橡皮擦開啟中：點算式裡的格子可以清掉", "hint");
  else showFeedback("", "");
}
function eraseSlot(slot) {
  if (slot.classList.contains("carry-slot")) {
    slot.textContent = "";
    delete slot.dataset.value;
    slot.classList.remove("filled", "erasable", "carry-preview");
    return;
  }
  const child = slotPiece(slot);
  if (!child) return;
  child.remove();
  slot.classList.remove("filled", "erasable");
  // 組合方塊放回 combo 區
  if (child.classList.contains("combo-block")) {
    child.classList.remove("placed");
    child.classList.add("ready");
    child.style.position = "";
    const area = $("comboArea");
    if (area && $("comboClear")) area.insertBefore(child, $("comboClear"));
    else if (area) area.appendChild(child);
  }
  const input = $("answer");
  if (input) { input.disabled = true; input.value = ""; }
}
document.addEventListener("pointerdown", (e) => {
  if (!eraserOn) return;
  const slot = e.target.closest("#equation .slot");
  if (!slot) return;
  e.stopPropagation();
  e.preventDefault();
  if (slot.classList.contains("carry-slot")) {
    if (slot.classList.contains("filled")) eraseSlot(slot);
  } else if (slotHasPiece(slot)) {
    eraseSlot(slot);
  }
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
  state.pendingCoins = 0; state.pendingBonus = 0;
  updateBag();
  updateStats();
  $("menuScreen").classList.remove("show");
  $("gameScreen").classList.add("show");
  $("gameTitle") && ($("gameTitle").textContent = type.title);
  document.title = type.title;
  newQuestion();
}

function backToMenu() {
  stopQuestionTimer();
  $("gameScreen").classList.remove("show");
  $("menuScreen").classList.add("show");
  hideVictory();
  if (eraserOn) setEraser(false);
}

/* ========== 點數收集袋 ========== */
function updateBag() {
  const el = $("pointsBagCount");
  if (el) el.textContent = state.bagPoints;
  saveBagPoints(state.bagPoints);
}

function queueBagPoints(opts = {}) {
  const { doubled = false, timedOut = false } = opts;
  if (timedOut) return; // 超時答對不發金幣
  // 每答對一題基本 5 點；連對到 5 的倍數加贈 5 點（共 10 點）
  const mul = doubled ? 2 : 1;
  state.pendingCoins += 5 * mul;
  if (state.streak > 0 && state.streak % 5 === 0) state.pendingBonus += 5 * mul;
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
  stopQuestionTimer();
  const elapsed = getElapsedMs();
  const timedOut = elapsed >= TIMER_LIMIT_MS;
  const doubled = !timedOut && elapsed < TIMER_BONUS_MS;
  state.correct++; state.streak++;
  let gained;
  if (timedOut) {
    gained = 1;
    state.score += gained;
  } else {
    const bonus = state.streak >= 3 ? 5 : 0;
    gained = (10 + bonus) * (doubled ? 2 : 1);
    state.score += gained;
  }
  queueBagPoints({ doubled, timedOut });
  window.PracticeStore?.recordResult(true, state.type?.id, state.type?.title);
  updateStats();
  showVictory(gained, { doubled, timedOut });
});
$("debugFailBtn").addEventListener("click", () => {
  if (!state.problem) return;
  state.wrong++; state.streak = 0;
  state.score = Math.max(0, state.score - 2);
  window.PracticeStore?.recordResult(false, state.type?.id, state.type?.title);
  updateStats();
  showFeedback("💥 Debug：已記為失敗", "wrong");
});
$("nextBtn")?.addEventListener("click", newQuestion);
$("resetBtn")?.addEventListener("click", () => {
  state.type.buildEquation($("equation"), state.problem);
  bindAnswerInput();
  resetWorkspace();
  showFeedback("", "");
});
$("backBtn")?.addEventListener("click", backToMenu);

buildDigitTray();
buildOpTray();
attachComboHandlers($("comboBlock"));
$("comboClear").addEventListener("click", () => clearCombo($("comboBlock")));
buildMenu();
