/* 共用算式步驟建構：所有題型用同一份結構，自動支援直式/橫式切換。
 *
 * 用法：
 *   const step = PlayMath.buildStep({
 *     label: "步驟1",
 *     a: "5", op: "×", b: "3",        // 上排三個格的預期值
 *     result: "15",                    // 下排結果格
 *   });
 *   // 答案格用 isAnswer: true，會渲染成 <input id="answer">
 *   const step2 = PlayMath.buildStep({
 *     label: "步驟2",
 *     a: "15", op: "+", b: "4",
 *     isAnswer: true,
 *   });
 *   eqEl.appendChild(step);
 *   eqEl.appendChild(step2);
 *   PlayMath.bindStepFlips(eqEl);   // 把 rotate-cw 按鈕接上切換功能
 */
window.PlayMath = window.PlayMath || {};

window.PlayMath.buildStep = function (cfg) {
  const { label, a, op, b, result, isAnswer } = cfg;
  const step = document.createElement("div");
  step.className = "step";
  const resultHtml = isAnswer
    ? `<input type="number" inputmode="numeric" class="answer-input eq-result" id="answer" placeholder="?" disabled />`
    : `<div class="slot num eq-result" data-expected="${result}"></div>`;
  step.innerHTML = `
    <div class="step-head">
      <div class="step-label">${label}</div>
      <button type="button" class="step-flip" title="切換直式 / 橫式" aria-label="切換直式 / 橫式">
        <i data-lucide="rotate-cw"></i>
      </button>
    </div>
    <div class="eq-body">
      <div class="slot num carry-slot" data-carry="1"></div>
      <div class="slot num eq-a" data-expected="${a}"></div>
      <div class="slot op eq-op" data-expected="${op}"></div>
      <div class="slot num eq-b" data-expected="${b}"></div>
      <hr class="eq-divider">
      <div class="eq-equal">=</div>
      ${resultHtml}
    </div>
  `;
  return step;
};

window.PlayMath.bindStepFlips = function (eqEl) {
  eqEl.querySelectorAll(".step-flip").forEach((btn) => {
    btn.addEventListener("click", () => {
      const step = btn.closest(".step");
      step.classList.toggle("vertical");
    });
  });
  if (window.lucide?.createIcons) window.lucide.createIcons();
};
