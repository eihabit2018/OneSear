import { WELCOME_MESSAGE, ROTATING_MESSAGES } from "./homepage.js";

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
