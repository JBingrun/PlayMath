/* 題型：二步驟運算拼圖
 * 結構：
 *   步驟1： b × a = product
 *   步驟2： product (+/-) c = answer
 * 由 game.js 的通用引擎呼叫 make() 與 buildEquation()。
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
const pickAdd = makePicker();
const pickSub = makePicker();

function make() {
  const a = rand(2, 9);
  const b = rand(2, 9);
  const product = a * b;
  let c, sign, ans, text;

  if (Math.random() < 0.5) {
    sign = "+";
    c = rand(2, 10);
    ans = product + c;
    text = pickAdd([
      `🍩 烘焙坊一早做好 ${a} 盒甜甜圈，每盒裝 ${b} 個，老闆又從冰箱補了 ${c} 個剛炸好的。請問現在櫃台上總共有幾個甜甜圈？`,
      `📚 圖書館整理書架，總共 ${a} 層，每層放 ${b} 本書。下午志工又搬來 ${c} 本捐贈的新書，現在書架上一共有幾本書？`,
      `🍎 媽媽帶小美去果園，採了滿滿 ${a} 袋蘋果，每袋 ${b} 顆。回家路上小美又跟阿姨買了 ${c} 顆，她們一共帶了幾顆蘋果回家？`,
      `🚗 哥哥在停車場數車子，看到 ${a} 排各停了 ${b} 輛車。沒多久又開來 ${c} 輛要停，現在停車場一共有幾輛車？`,
      `🐠 早上水族館的 ${a} 個魚缸各放了 ${b} 條魚，到了下午館長又從外面帶回 ${c} 條新魚放進來。請問現在館內共有幾條魚？`,
      `🍪 中午點心時間，廚房端出 ${a} 盤餅乾，每盤 ${b} 片。下課時老師又從櫃子拿出 ${c} 片，請問全部一共有幾片餅乾？`,
    ]);
  } else {
    sign = "−";
    const maxC = Math.min(product - 1, 10);
    c = rand(1, maxC);
    ans = product - c;
    text = pickSub([
      `🍰 蛋糕店一早烤好 ${a} 盤蛋糕，每盤 ${b} 個。中午被客人買走了 ${c} 個，請問櫃子裡還剩下幾個蛋糕？`,
      `🎈 校慶布置準備了 ${a} 包氣球，每包 ${b} 顆，吹的時候不小心破掉 ${c} 顆。現在還剩下幾顆可以用？`,
      `🍊 小安和爺爺到水果店幫忙，他們把橘子分裝成 ${a} 籃，每籃放 ${b} 顆。中午一位老師來買禮盒帶走了 ${c} 顆，請問架上還剩下幾顆橘子？`,
      `🍪 阿嬤烤了 ${a} 盒餅乾，每盒裝 ${b} 片，弟弟拿了 ${c} 片去分給同學。請問餅乾盒裡還剩下幾片？`,
      `📦 早上倉庫裡有 ${a} 箱書，每箱 ${b} 本。下午工人搬走了 ${c} 本送去學校，請問倉庫裡現在還剩下幾本書？`,
      `🐟 清晨漁夫捕了 ${a} 簍魚，每簍 ${b} 條。中午到市場賣掉 ${c} 條，請問漁夫的船上還剩下幾條魚？`,
    ]);
  }
  return { a, b, c, sign, ans, text, product };
}

function buildEquation(eqEl, problem) {
  eqEl.innerHTML = "";
  const { a, b, c, sign, product } = problem;
  eqEl.appendChild(PlayMath.buildStep({ label: "步驟1", a: b, op: "×", b: a, result: product }));
  eqEl.appendChild(PlayMath.buildStep({ label: "步驟2", a: product, op: sign, b: c, isAnswer: true }));
  PlayMath.bindStepFlips(eqEl);
}

window.PROBLEM_TYPES = window.PROBLEM_TYPES || [];
window.PROBLEM_TYPES.push({
  id: "twoStepPuzzle",
  title: "二步驟運算拼圖",
  emoji: "🧩",
  description: "把數字和符號拖到算式裡，算出兩步驟的答案。",
  make,
  buildEquation,
});
