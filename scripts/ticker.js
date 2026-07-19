const WELCOME_MESSAGE =
  "输入你想要搜索的内容，并@你想要用的平台，开始搜索";

const ROTATING_MESSAGES = [
  "守护好你的注意力，别被推荐内容带跑了你。",
  "常回来看看，我们本来打算要什么？",
  "一切从这里开始。",
  "推荐流里的绿地——你来搜，而不是被推着看。",
  "算法记得你的停留，你要记得自己的目的。",
  "少刷一条信息流，多留一点给自己。",
  "主动选择平台，比被动打开 App 更接近本意。",
  "想清楚再出发，比漫无目的更有效。",
];

const INITIAL_HOLD_MS = 5000;
const ROTATE_INTERVAL_MS = 4500;

export function initSubtitleTicker(lineElement) {
  lineElement.textContent = WELCOME_MESSAGE;

  let rotateIndex = 0;

  function showNext() {
    lineElement.classList.remove("ticker-in");
    lineElement.classList.add("ticker-out");

    window.setTimeout(() => {
      lineElement.textContent = ROTATING_MESSAGES[rotateIndex];
      rotateIndex = (rotateIndex + 1) % ROTATING_MESSAGES.length;

      lineElement.classList.remove("ticker-out");
      lineElement.classList.add("ticker-in");

      window.setTimeout(() => {
        lineElement.classList.remove("ticker-in");
        window.setTimeout(showNext, ROTATE_INTERVAL_MS);
      }, 380);
    }, 350);
  }

  window.setTimeout(showNext, INITIAL_HOLD_MS);
}
