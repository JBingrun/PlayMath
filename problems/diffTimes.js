(function(){
/* 題型 A：差 × 數量  →  (a − b) × c
 * 步驟1：a − b = diff
 * 步驟2：diff × c = answer
 */

const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = (arr) => arr[rand(0, arr.length - 1)];
const makePicker = () => {
  let last = -1;
  return (arr) => {
    if (arr.length <= 1) return arr[0];
    let i;
    do { i = rand(0, arr.length - 1); } while (i === last);
    last = i;
    return arr[i];
  };
};
const pickText = makePicker();

function make() {
  const b = rand(2, 9);          // 便宜的金額
  const a = b + rand(2, 9);      // 原價（一定 > b，且 diff 維持一位數）
  const c = rand(2, 9);          // 買幾杯/幾個
  const diff = a - b;
  const ans = diff * c;

  const text = pickText([
    `🧋 一杯紅茶 ${a} 元，一杯奶茶比紅茶便宜 ${b} 元，買 ${c} 杯奶茶要付多少元？`,
    `🍗 一份雞排 ${a} 元，一份雞塊比雞排便宜 ${b} 元，買 ${c} 份雞塊要花多少元？`,
    `🍕 一片披薩原價 ${a} 元，特價時便宜 ${b} 元，媽媽特價時買了 ${c} 片，共要多少元？`,
    `🥤 一瓶可樂 ${a} 元，一瓶汽水比可樂便宜 ${b} 元，買 ${c} 瓶汽水要付多少元？`,
    `🍦 一支巧克力冰淇淋 ${a} 元，香草口味比巧克力便宜 ${b} 元，買 ${c} 支香草口味要多少元？`,
    `📒 一本筆記本 ${a} 元，特價時便宜 ${b} 元，老師特價買了 ${c} 本，共花多少元？`,
  ]);

  return { a, b, c, diff, ans, text };
}

function buildEquation(eqEl, problem) {
  eqEl.innerHTML = "";
  const { a, b, c, diff } = problem;
  eqEl.appendChild(PlayMath.buildStep({ label: "步驟1", a, op: "−", b, result: diff }));
  eqEl.appendChild(PlayMath.buildStep({ label: "步驟2", a: diff, op: "×", b: c, isAnswer: true }));
  PlayMath.bindStepFlips(eqEl);
}

window.PROBLEM_TYPES = window.PROBLEM_TYPES || [];
window.PROBLEM_TYPES.push({
  id: "diffTimes",
  title: "便宜幾元 × 數量",
  emoji: "🧋",
  description: "先算便宜多少，再算買好幾份共要多少。",
  make,
  buildEquation,
});
})();
