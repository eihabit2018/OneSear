const DEFAULT_HINT = "输入 @ 可唤起平台列表 · 按 Enter 搜索 · Esc 清空";

const HISTORY_OPEN_HINT = "再次点击「我查看过」按钮，收起查看历史";

export function initHintTicker(lineElement) {
  lineElement.textContent = DEFAULT_HINT;

  return {
    setHistoryOpen(open) {
      lineElement.classList.remove("ticker-out", "ticker-in");
      lineElement.textContent = open ? HISTORY_OPEN_HINT : DEFAULT_HINT;
    },
  };
}
