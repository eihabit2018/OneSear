const DEFAULT_HINT = "输入 @ 可唤起平台列表 · 按 Enter 搜索 · Esc 清空";

const HISTORY_OPEN_HINT = "再次点击「我查看过」按钮，收起查看历史";
const EXPLORE_OPEN_HINT = "再次点击「随便看看」按钮，收起网址导航";

export function initHintTicker(lineElement) {
  let historyOpen = false;
  let exploreOpen = false;

  function refresh() {
    lineElement.classList.remove("ticker-out", "ticker-in");
    if (exploreOpen) {
      lineElement.textContent = EXPLORE_OPEN_HINT;
    } else if (historyOpen) {
      lineElement.textContent = HISTORY_OPEN_HINT;
    } else {
      lineElement.textContent = DEFAULT_HINT;
    }
  }

  lineElement.textContent = DEFAULT_HINT;

  return {
    setHistoryOpen(open) {
      historyOpen = open;
      refresh();
    },
    setExploreOpen(open) {
      exploreOpen = open;
      refresh();
    },
  };
}
