(function(){
/* 題型 D：兩組相減比較  →  a × b − a × c （三步驟）
 * 步驟1：a × b = p1
 * 步驟2：a × c = p2
 * 步驟3：p1 − p2 = answer
 * 對應 PDF：「8 瓶飲料 18 元 vs 8 瓶礦泉水 11 元，飲料貴多少？」
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
  const a = rand(2, 8);            // 共同數量
  const c = rand(3, 12);           // 較便宜
  const b = c + rand(2, 10);       // 較貴
  const p1 = a * b;
  const p2 = a * c;
  const ans = p1 - p2;

  const text = pickText([
    `🥤 一杯珍奶 ${b} 元，一杯紅茶 ${c} 元，買 ${a} 杯珍奶比買 ${a} 杯紅茶貴幾元？`,
    `🍌 一根香蕉 ${b} 元，一顆蘋果 ${c} 元，買 ${a} 根香蕉比買 ${a} 顆蘋果貴多少元？`,
    `🧃 一瓶蘋果汁 ${b} 元，一瓶礦泉水 ${c} 元，買 ${a} 瓶蘋果汁比 ${a} 瓶礦泉水貴幾元？`,
    `🍩 一個甜甜圈 ${b} 元，一個小餐包 ${c} 元，買 ${a} 個甜甜圈比 ${a} 個小餐包貴幾元？`,
    `🥨 一個可頌 ${b} 元，一個吐司 ${c} 元，買 ${a} 個可頌比 ${a} 個吐司貴多少元？`,
  ]);

  return { a, b, c, p1, p2, ans, text };
}

function buildEquation(eqEl, problem) {
  eqEl.innerHTML = "";
  const { a, b, c, p1, p2 } = problem;
  eqEl.appendChild(PlayMath.buildStep({ label: "步驟1", a, op: "×", b, result: p1 }));
  eqEl.appendChild(PlayMath.buildStep({ label: "步驟2", a, op: "×", b: c, result: p2 }));
  eqEl.appendChild(PlayMath.buildStep({ label: "步驟3", a: p1, op: "−", b: p2, isAnswer: true }));
  PlayMath.bindStepFlips(eqEl);
}

window.PROBLEM_TYPES = window.PROBLEM_TYPES || [];
window.PROBLEM_TYPES.push({
  id: "compareTwoGroups",
  title: "比較貴多少",
  emoji: "🥤",
  description: "兩種東西買一樣的數量，比較貴幾元。",
  make,
  buildEquation,
});
})();
