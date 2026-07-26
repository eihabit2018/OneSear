import {
  addSearchHistory,
  clearSearchHistory,
  getSearchHistory,
  removeSearchHistory,
} from "./history.js";
import {
  findProviderByAlias,
  findProviderById,
  filterProviders,
  getActiveMentionFilter,
  MENTION_PATTERN,
  parseMentionInput,
} from "./router.js";
import { initHintTicker } from "./hint-ticker.js";
import { initSubtitleTicker } from "./ticker.js";

// ---------- DOM refs (all in one place, before any handlers) ----------

const form = document.getElementById("search-form");
const input = document.getElementById("search-input");
const result = document.getElementById("result");
const resultBadge = document.getElementById("result-badge");
const resultText = document.getElementById("result-text");
const alternatives = document.getElementById("alternatives");
const mentionMenu = document.getElementById("mention-menu");
const historyToggle = document.getElementById("history-toggle");
const historyPanel = document.getElementById("history-panel");
const historyList = document.getElementById("history-list");
const historyClear = document.getElementById("history-clear");
const historyLayoutToggle = document.getElementById("history-layout-toggle");

const bgSettingsBtn = document.getElementById("bg-settings-btn");
const bgMenu = document.getElementById("bg-menu");
const bgUploadBtn = document.getElementById("bg-upload-btn");
const bgResetBtn = document.getElementById("bg-reset-btn");
const bgFileInput = document.getElementById("bg-file-input");

const exploreToggle = document.getElementById("explore-toggle");
const explorePanel = document.getElementById("explore-panel");
const exploreModules = document.getElementById("explore-modules");
const exploreEditBtn = document.getElementById("explore-edit-btn");
const exploreCancelBtn = document.getElementById("explore-cancel-btn");
const exploreRestoreBtn = document.getElementById("explore-restore-btn");
const exploreAddOverlay = document.getElementById("explore-add-overlay");
const exploreAddName = document.getElementById("explore-add-name");
const exploreAddUrl = document.getElementById("explore-add-url");
const exploreAddConfirmBtn = document.getElementById("explore-add-confirm-btn");
const exploreAddCancelBtn = document.getElementById("explore-add-cancel-btn");
const exploreAddError = document.getElementById("explore-add-error");
const exploreConfirmOverlay = document.getElementById("explore-confirm-overlay");
const exploreConfirmMsg = document.getElementById("explore-confirm-msg");
const exploreConfirmOkBtn = document.getElementById("explore-confirm-ok-btn");
const exploreConfirmCancelBtn = document.getElementById("explore-confirm-cancel-btn");

const pinnedEnginesContainer = document.getElementById("pinned-engines");

const HISTORY_LAYOUT_KEY = "one-search-history-layout";
let historyLayout = localStorage.getItem(HISTORY_LAYOUT_KEY) === "compact" ? "compact" : "detail";

let activeMentionIndex = -1;
const hintTicker = initHintTicker(document.getElementById("hint-line"));

const ERROR_MESSAGES = {
  empty_input: "请输入搜索内容",
  no_mention: "请用 @ 指定平台，例如：今天天气 @百度 或 @百度 @google",
  unknown_provider: (mention) =>
    `未识别平台「@${mention}」，请检查拼写或输入 @ 查看可用平台`,
  empty_query: "请在 @ 平台 之外输入要搜索的内容",
};

function openSearch(url) {
  window.open(url, "_blank", "noopener,noreferrer");
}

function openAllSearches(targets) {
  for (const target of targets) {
    openSearch(target.url);
  }
}

function hideMentionMenu() {
  mentionMenu.hidden = true;
  mentionMenu.replaceChildren();
  activeMentionIndex = -1;
}

function insertMention(alias) {
  const value = input.value;
  const caret = input.selectionStart ?? value.length;
  const mention = `@${alias} `;
  input.value = `${value.slice(0, caret)}${mention}${value.slice(caret)}`;
  const nextCaret = caret + mention.length;
  input.setSelectionRange(nextCaret, nextCaret);
  input.focus();
  hideMentionMenu();
  checkAndPinDoubleMentions();
  updatePreview();
}

function renderMentionMenu(filter) {
  const matches = filterProviders(filter).slice(0, 8);
  if (matches.length === 0) {
    hideMentionMenu();
    return;
  }

  mentionMenu.hidden = false;
  mentionMenu.replaceChildren();
  activeMentionIndex = 0;

  for (const [index, provider] of matches.entries()) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "mention-item";
    button.innerHTML = `<strong>@${provider.aliases[0]}</strong><span>${provider.name}</span>`;
    button.addEventListener("mousedown", (event) => {
      event.preventDefault();
      selectMentionFromMenu(provider.aliases[0]);
    });
    mentionMenu.appendChild(button);
  }

  highlightMentionItem();
}

function highlightMentionItem() {
  const items = mentionMenu.querySelectorAll(".mention-item");
  for (const [index, item] of items.entries()) {
    item.classList.toggle("is-active", index === activeMentionIndex);
  }
}

function selectMentionFromMenu(alias) {
  const caret = input.selectionStart ?? input.value.length;
  const mentionState = getActiveMentionFilter(input.value, caret);
  if (!mentionState) {
    insertMention(alias);
    return;
  }

  const before = input.value.slice(0, mentionState.atIndex);
  const after = input.value.slice(caret);
  input.value = `${before}@${alias} ${after}`;
  const nextCaret = before.length + alias.length + 2;
  input.setSelectionRange(nextCaret, nextCaret);
  hideMentionMenu();
  checkAndPinDoubleMentions();
  updatePreview();
}

function formatProviderNames(targets) {
  return targets.map((t) => t.provider.name).join("、");
}

function renderResult(parsed, { autoOpen = true, saveHistory = false } = {}) {
  alternatives.replaceChildren();

  if (!parsed.ok) {
    result.hidden = false;
    resultBadge.textContent = "提示";
    resultBadge.classList.add("is-error");

    if (parsed.error === "unknown_provider") {
      resultText.textContent = ERROR_MESSAGES.unknown_provider(parsed.mention);
    } else if (parsed.error === "empty_query") {
      resultText.textContent = ERROR_MESSAGES.empty_query;
    } else {
      resultText.textContent = ERROR_MESSAGES[parsed.error];
    }
    return;
  }

  const { targets, query } = parsed;
  const count = targets.length;

  result.hidden = false;
  resultBadge.classList.remove("is-error");
  resultBadge.textContent = count > 1 ? `${count} 个平台` : targets[0].provider.name;

  if (count > 1) {
    resultText.textContent = `正在 ${formatProviderNames(targets)} 搜索「${query}」`;
    for (const target of targets) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "alt-chip";
      chip.textContent = target.provider.name;
      chip.addEventListener("click", () => openSearch(target.url));
      alternatives.appendChild(chip);
    }
  } else {
    resultText.textContent = `正在 ${targets[0].provider.name} 搜索「${query}」`;
  }

  if (autoOpen) {
    const rawInput = input.value.trim();
    openAllSearches(targets);
    if (saveHistory) {
      addSearchHistory({
        query,
        providers: targets.map((t) => t.provider),
        rawInput,
      });
      renderHistoryList();
    }
    input.value = "";
    hideMentionMenu();
  }
}

function updatePreview() {
  let parsed = parseMentionInput(input.value);
  if (parsed.error === "empty_input") {
    result.hidden = true;
    return;
  }
  if (parsed.error === "no_mention") {
    if (pinnedEngineIds.length > 0 && input.value.trim()) {
      const query = input.value.trim();
      const targets = pinnedEngineIds
        .map((id) => findProviderById(id))
        .filter(Boolean)
        .map((provider) => ({
          provider,
          mention: provider.aliases[0],
          url: provider.buildUrl(query),
        }));
      parsed = { ok: true, query, targets, provider: targets[0].provider, url: targets[0].url };
    } else {
      result.hidden = true;
      return;
    }
  }
  renderResult(parsed, { autoOpen: false });
}

function setHistoryOpen(open) {
  historyPanel.hidden = !open;
  historyToggle.setAttribute("aria-expanded", String(open));
  hintTicker.setHistoryOpen(open);
}

function getProviderPrimaryAlias(providerId) {
  const provider = findProviderById(providerId);
  return provider?.aliases[0] ?? providerId;
}

function formatHistoryCompactText(item) {
  const mentions = item.providers.map((p) => `@${getProviderPrimaryAlias(p.id)}`).join(" ");
  return `${mentions} ${item.query}`.trim();
}

function fillCompactChip(chip, text) {
  chip.replaceChildren();
  MENTION_PATTERN.lastIndex = 0;
  let lastIndex = 0;
  let match = MENTION_PATTERN.exec(text);

  while (match) {
    if (match.index > lastIndex) {
      chip.append(document.createTextNode(text.slice(lastIndex, match.index)));
    }
    const mention = document.createElement("span");
    mention.className = "history-compact-mention";
    mention.textContent = match[0];
    chip.append(mention);
    lastIndex = MENTION_PATTERN.lastIndex;
    match = MENTION_PATTERN.exec(text);
  }

  if (lastIndex < text.length) {
    chip.append(document.createTextNode(text.slice(lastIndex)));
  }
}

function runHistorySearch(item) {
  input.value = item.rawInput || formatHistoryCompactText(item);
  setHistoryOpen(false);
  renderResult(parseMentionInput(input.value), { autoOpen: true, saveHistory: false });
}

function updateHistoryLayoutToggle() {
  const isCompact = historyLayout === "compact";
  historyLayoutToggle.textContent = isCompact ? "详细" : "紧凑";
  historyLayoutToggle.title = isCompact ? "切换为详细列表" : "切换为紧凑列表";
  historyLayoutToggle.setAttribute(
    "aria-label",
    isCompact ? "切换为详细列表" : "切换为紧凑列表",
  );
}

function formatHistoryTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const time = date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  if (isToday) {
    return `今天 ${time}`;
  }
  return date.toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function renderHistoryList() {
  const items = getSearchHistory();
  historyList.replaceChildren();
  historyList.classList.toggle("is-compact", historyLayout === "compact");

  if (items.length === 0) {
    const empty = document.createElement("p");
    empty.className = "history-empty";
    empty.textContent = "暂无历史记录，完成一次搜索后会出现在这里";
    historyList.appendChild(empty);
    historyClear.hidden = true;
    historyLayoutToggle.hidden = true;
    return;
  }

  historyClear.hidden = false;
  historyLayoutToggle.hidden = false;
  updateHistoryLayoutToggle();

  if (historyLayout === "compact") {
    for (const item of items) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "history-compact-item";
      fillCompactChip(chip, formatHistoryCompactText(item));
      chip.addEventListener("click", () => runHistorySearch(item));
      historyList.appendChild(chip);
    }
    return;
  }

  for (const item of items) {
    const row = document.createElement("div");
    row.className = "history-item";

    const main = document.createElement("button");
    main.type = "button";
    main.className = "history-item-main";
    main.innerHTML = `
      <span class="history-query">${escapeHtml(item.query)}</span>
      <span class="history-platforms">${escapeHtml(item.providers.map((p) => p.name).join(" · "))}</span>
      <span class="history-time">${formatHistoryTime(item.createdAt)}</span>
    `;
    main.addEventListener("click", () => {
      input.value = item.rawInput || formatHistoryCompactText(item);
      setHistoryOpen(false);
      updatePreview();
      input.focus();
    });

    const actions = document.createElement("div");
    actions.className = "history-item-actions";

    const searchBtn = document.createElement("button");
    searchBtn.type = "button";
    searchBtn.className = "history-action";
    searchBtn.textContent = "搜索";
    searchBtn.addEventListener("click", () => runHistorySearch(item));

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "history-action history-action-delete";
    deleteBtn.textContent = "删除";
    deleteBtn.addEventListener("click", () => {
      removeSearchHistory(item.id);
      renderHistoryList();
    });

    actions.append(searchBtn, deleteBtn);
    row.append(main, actions);
    historyList.appendChild(row);
  }
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

historyToggle.addEventListener("click", () => {
  const willOpen = historyPanel.hidden;
  setHistoryOpen(willOpen);
  if (willOpen) {
    renderHistoryList();
    if (!explorePanel.hidden) closeExplorePanel();
  }
});

historyClear.addEventListener("click", () => {
  clearSearchHistory();
  renderHistoryList();
});

historyLayoutToggle.addEventListener("click", () => {
  historyLayout = historyLayout === "compact" ? "detail" : "compact";
  localStorage.setItem(HISTORY_LAYOUT_KEY, historyLayout);
  renderHistoryList();
});

// document click-to-close handlers are registered at the bottom of the file

form.addEventListener("submit", (event) => {
  event.preventDefault();
  hideMentionMenu();

  let parsed = parseMentionInput(input.value);

  // merge pinned engines into search targets
  if (parsed.ok) {
    const mentionedIds = new Set(parsed.targets.map((t) => t.provider.id));
    const extraTargets = [];
    for (const id of pinnedEngineIds) {
      if (!mentionedIds.has(id)) {
        const provider = findProviderById(id);
        if (provider) {
          extraTargets.push({
            provider,
            mention: provider.aliases[0],
            url: provider.buildUrl(parsed.query),
          });
        }
      }
    }
    parsed = { ...parsed, targets: [...parsed.targets, ...extraTargets] };
  } else if (parsed.error === "no_mention" && pinnedEngineIds.length > 0) {
    const query = input.value.trim();
    if (query) {
      const targets = pinnedEngineIds
        .map((id) => findProviderById(id))
        .filter(Boolean)
        .map((provider) => ({
          provider,
          mention: provider.aliases[0],
          url: provider.buildUrl(query),
        }));
      parsed = { ok: true, query, targets, provider: targets[0].provider, url: targets[0].url };
    }
  }

  renderResult(parsed, { autoOpen: true, saveHistory: true });
});

input.addEventListener("focus", () => {
  if (!input.value.trim()) {
    result.hidden = true;
  }
});

input.addEventListener("input", () => {
  const caret = input.selectionStart ?? input.value.length;
  const mentionState = getActiveMentionFilter(input.value, caret);
  if (mentionState) {
    renderMentionMenu(mentionState.filter);
  } else {
    hideMentionMenu();
  }

  // detect double @mentions and pin engines in real-time
  checkAndPinDoubleMentions();

  updatePreview();
});

input.addEventListener("keydown", (event) => {
  if (!mentionMenu.hidden) {
    const items = mentionMenu.querySelectorAll(".mention-item");
    if (event.key === "ArrowDown") {
      event.preventDefault();
      activeMentionIndex = Math.min(activeMentionIndex + 1, items.length - 1);
      highlightMentionItem();
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      activeMentionIndex = Math.max(activeMentionIndex - 1, 0);
      highlightMentionItem();
      return;
    }
    if (event.key === "Enter" && activeMentionIndex >= 0) {
      event.preventDefault();
      const activeItem = items[activeMentionIndex];
      const alias = activeItem?.querySelector("strong")?.textContent?.slice(1);
      if (alias) {
        selectMentionFromMenu(alias);
      }
      return;
    }
    if (event.key === "Escape") {
      hideMentionMenu();
      return;
    }
  }

  if (event.key === "Escape") {
    if (!exploreConfirmOverlay.hidden) {
      exploreConfirmCancelBtn.click();
      return;
    }
    if (!exploreAddOverlay.hidden) {
      hideAddDialog();
      return;
    }
    if (!explorePanel.hidden) {
      closeExplorePanel();
      return;
    }
    if (!bgMenu.hidden) {
      closeBgMenu();
      return;
    }
    if (!historyPanel.hidden) {
      setHistoryOpen(false);
      return;
    }
    input.value = "";
    result.hidden = true;
    hideMentionMenu();
    input.focus();
  }
});

input.addEventListener("blur", () => {
  window.setTimeout(hideMentionMenu, 120);
});

// ---------- Pinned search engines ----------

const PINNED_KEY = "one-search-pinned-engines";

let pinnedEngineIds = loadPinnedEngines();

function loadPinnedEngines() {
  try {
    const saved = localStorage.getItem(PINNED_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function savePinnedEngines(ids) {
  localStorage.setItem(PINNED_KEY, JSON.stringify(ids));
}

function renderPinnedChips() {
  pinnedEnginesContainer.replaceChildren();
  for (const id of pinnedEngineIds) {
    const provider = findProviderById(id);
    if (!provider) continue;
    const chip = document.createElement("span");
    chip.className = "pinned-chip";
    chip.title = `点击取消固定 ${provider.name}`;
    chip.innerHTML = `${provider.name}<span class="pinned-chip-close">×</span>`;
    chip.addEventListener("click", () => unpinEngine(id));
    pinnedEnginesContainer.appendChild(chip);
  }
}

function pinEngine(providerId) {
  if (pinnedEngineIds.includes(providerId)) return;
  pinnedEngineIds.push(providerId);
  savePinnedEngines(pinnedEngineIds);
  renderPinnedChips();
}

function unpinEngine(providerId) {
  pinnedEngineIds = pinnedEngineIds.filter((id) => id !== providerId);
  savePinnedEngines(pinnedEngineIds);
  renderPinnedChips();
}

function detectDoubleMentions(rawInput) {
  const mentions = [...rawInput.matchAll(MENTION_PATTERN)];
  const countMap = new Map();
  for (const m of mentions) {
    const provider = findProviderByAlias(m[1]);
    if (provider) {
      countMap.set(provider.id, (countMap.get(provider.id) || 0) + 1);
    }
  }
  return [...countMap.entries()]
    .filter(([, count]) => count >= 2)
    .map(([id]) => id);
}

function stripMentionsForPlatform(rawInput, providerId) {
  const provider = findProviderById(providerId);
  if (!provider) return rawInput;
  const escapedAliases = provider.aliases.map((a) =>
    a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  );
  const pattern = new RegExp(`@(?:${escapedAliases.join("|")})\\s*`, "gi");
  return rawInput.replace(pattern, "").replace(/\s+/g, " ").trim();
}

function checkAndPinDoubleMentions() {
  const doubleIds = detectDoubleMentions(input.value);
  let changed = false;
  for (const id of doubleIds) {
    pinEngine(id);
    input.value = stripMentionsForPlatform(input.value, id);
    changed = true;
  }
  if (changed) {
    input.setSelectionRange(input.value.length, input.value.length);
  }
  return changed;
}

// ---------- Background settings (IndexedDB) ----------

const BG_DB_NAME = "one-search";
const BG_STORE = "background";
const BG_KEY = "bg";

function openBgDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(BG_DB_NAME, 1);
    req.addEventListener("upgradeneeded", () => {
      if (!req.result.objectStoreNames.contains(BG_STORE)) {
        req.result.createObjectStore(BG_STORE);
      }
    });
    req.addEventListener("success", () => resolve(req.result));
    req.addEventListener("error", () => reject(req.error));
  });
}

async function saveBgToDB(dataUrl) {
  const db = await openBgDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(BG_STORE, "readwrite");
    tx.objectStore(BG_STORE).put(dataUrl, BG_KEY);
    tx.addEventListener("complete", () => resolve());
    tx.addEventListener("error", () => reject(tx.error));
  });
}

async function loadBgFromDB() {
  const db = await openBgDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(BG_STORE, "readonly");
    const req = tx.objectStore(BG_STORE).get(BG_KEY);
    req.addEventListener("success", () => resolve(req.result ?? null));
    req.addEventListener("error", () => reject(req.error));
  });
}

async function removeBgFromDB() {
  const db = await openBgDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(BG_STORE, "readwrite");
    tx.objectStore(BG_STORE).delete(BG_KEY);
    tx.addEventListener("complete", () => resolve());
    tx.addEventListener("error", () => reject(tx.error));
  });
}

function applyBackground(dataUrl) {
  document.body.style.backgroundImage = `url(${dataUrl})`;
  document.body.classList.add("has-custom-bg");
}

function removeBackground() {
  document.body.style.backgroundImage = "";
  document.body.classList.remove("has-custom-bg");
}

async function loadBackground() {
  try {
    const saved = await loadBgFromDB();
    if (saved) {
      applyBackground(saved);
    }
  } catch {
    // IndexedDB unavailable — ignore
  }
}

function toggleBgMenu() {
  const willOpen = bgMenu.hidden;
  bgMenu.hidden = !willOpen;
  bgSettingsBtn.classList.toggle("is-open", willOpen);
}

function closeBgMenu() {
  bgMenu.hidden = true;
  bgSettingsBtn.classList.remove("is-open");
}

bgSettingsBtn.addEventListener("click", toggleBgMenu);

bgUploadBtn.addEventListener("click", () => {
  bgFileInput.click();
});

bgFileInput.addEventListener("change", async () => {
  const file = bgFileInput.files[0];
  bgFileInput.value = "";
  if (!file) return;

  const reader = new FileReader();
  reader.addEventListener("load", async () => {
    await saveBgToDB(reader.result);
    applyBackground(reader.result);
  });
  reader.readAsDataURL(file);
  closeBgMenu();
});

bgResetBtn.addEventListener("click", async () => {
  await removeBgFromDB();
  removeBackground();
  closeBgMenu();
});

// ---------- Explore / navigation panel ----------

function setExploreOpen(open) {
  explorePanel.hidden = !open;
  exploreToggle.setAttribute("aria-expanded", String(open));
  hintTicker.setExploreOpen(open);
}

// ---------- Navigation data & persistence ----------

const NAV_STORAGE_KEY = "one-search-nav-custom";
const FALLBACK_FAVICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%235b6d85' stroke-width='1.5'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Cline x1='2' y1='12' x2='22' y2='12'/%3E%3Cpath d='M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z'/%3E%3C/svg%3E";

let navData = null;
let originalNavSnapshot = null;
let isEditing = false;

// references set by renderExploreModules for re-render
let _showCategory = null;
let _currentSectionIdx = 0;
let _currentCatIdx = 0;

function resetEditUI() {
  isEditing = false;
  exploreEditBtn.textContent = "编辑";
  exploreEditBtn.classList.remove("explore-save-btn");
  exploreCancelBtn.hidden = true;
  exploreRestoreBtn.hidden = true;
  explorePanel.classList.remove("is-editing");
}

function rerenderCurrentView() {
  if (_showCategory) _showCategory(_currentCatIdx);
}

async function loadNavData() {
  const saved = localStorage.getItem(NAV_STORAGE_KEY);
  if (saved) {
    try { return JSON.parse(saved); } catch { /* ignore corrupt data */ }
  }
  try {
    const res = await fetch("data/navigation.json");
    if (!res.ok) throw new Error("not found");
    return res.json();
  } catch {
    return [];
  }
}

function saveNavDataToStorage(data) {
  localStorage.setItem(NAV_STORAGE_KEY, JSON.stringify(data));
}

function clearNavStorage() {
  localStorage.removeItem(NAV_STORAGE_KEY);
}

// ---------- Edit mode ----------

function enterEditMode() {
  isEditing = true;
  originalNavSnapshot = structuredClone(navData);
  exploreEditBtn.textContent = "保存";
  exploreEditBtn.classList.add("explore-save-btn");
  exploreCancelBtn.hidden = false;
  exploreRestoreBtn.hidden = false;
  explorePanel.classList.add("is-editing");
  rerenderCurrentView();
}

function exitEditMode(saveChanges) {
  if (saveChanges) {
    saveNavDataToStorage(navData);
  }
  resetEditUI();

  if (!saveChanges) {
    navData = originalNavSnapshot;
    renderExploreModules(navData);
    return;
  }

  rerenderCurrentView();
}

exploreEditBtn.addEventListener("click", () => {
  if (isEditing) {
    exitEditMode(true);
  } else {
    enterEditMode();
  }
});

exploreCancelBtn.addEventListener("click", () => {
  exitEditMode(false);
});

exploreRestoreBtn.addEventListener("click", () => {
  showConfirmDialog("确定恢复默认网址导航？当前编辑的网址将被清除。", {
    onConfirm: () => {
      clearNavStorage();
      navData = null;
      loadNavData().then((data) => {
        navData = data;
        originalNavSnapshot = null;
        resetEditUI();
        renderExploreModules(data);
      });
    },
  });
});

// ---------- Add-link dialog ----------

function showAddDialog() {
  exploreAddOverlay.hidden = false;
  exploreAddError.hidden = true;
  exploreAddName.value = "";
  exploreAddUrl.value = "";
  exploreAddName.focus();
}

function hideAddDialog() {
  exploreAddOverlay.hidden = true;
}

exploreAddCancelBtn.addEventListener("click", hideAddDialog);

exploreAddConfirmBtn.addEventListener("click", () => {
  const name = exploreAddName.value.trim();
  const url = exploreAddUrl.value.trim();
  if (!name || !url) {
    exploreAddError.textContent = "请填写网站名称和网址";
    exploreAddError.hidden = false;
    return;
  }
  try {
    new URL(url);
  } catch {
    exploreAddError.textContent = "请按照给定格式输入有效的网址";
    exploreAddError.hidden = false;
    return;
  }
  exploreAddError.hidden = true;
  const cat = navData[_currentSectionIdx].categories[_currentCatIdx];
  cat.links.push({ name, url });
  hideAddDialog();
  rerenderCurrentView();
});

// close add dialog on overlay click
exploreAddOverlay.addEventListener("click", (e) => {
  if (e.target === exploreAddOverlay) hideAddDialog();
});

// ---------- Generic confirm dialog ----------

let _confirmAbort = null;

function showConfirmDialog(message, { onConfirm, onCancel } = {}) {
  _confirmAbort?.abort();
  const controller = new AbortController();
  _confirmAbort = controller;
  const { signal } = controller;

  exploreConfirmMsg.textContent = message;
  exploreConfirmOverlay.hidden = false;
  exploreConfirmOkBtn.focus();

  exploreConfirmOkBtn.addEventListener("click", () => {
    controller.abort();
    exploreConfirmOverlay.hidden = true;
    if (onConfirm) onConfirm();
  }, { signal });

  exploreConfirmCancelBtn.addEventListener("click", () => {
    controller.abort();
    exploreConfirmOverlay.hidden = true;
    if (onCancel) onCancel();
  }, { signal });

  exploreConfirmOverlay.addEventListener("click", (e) => {
    if (e.target === exploreConfirmOverlay) {
      controller.abort();
      exploreConfirmOverlay.hidden = true;
      if (onCancel) onCancel();
    }
  }, { signal });
}

// ---------- Rendering ----------

function faviconUrl(url) {
  try {
    const host = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${host}&sz=32`;
  } catch {
    return FALLBACK_FAVICON;
  }
}

function renderExploreModules(data) {
  navData = data;
  exploreModules.replaceChildren();

  const sectionTabs = document.createElement("div");
  sectionTabs.className = "explore-section-tabs";

  _currentSectionIdx = data.findIndex((s) => s.categories && s.categories.length > 0);
  if (_currentSectionIdx < 0) _currentSectionIdx = 0;

  function setActiveTab(container, activeIndex) {
    for (let i = 0; i < container.children.length; i++) {
      container.children[i].classList.toggle("is-active", i === activeIndex);
    }
  }

  function showSection(index) {
    _currentSectionIdx = index;
    setActiveTab(sectionTabs, index);

    const section = data[index];

    let body = exploreModules.querySelector(".explore-module-body");
    if (body) body.replaceChildren();
    else {
      body = document.createElement("div");
      body.className = "explore-module-body";
      exploreModules.appendChild(body);
    }

    const catTabs = document.createElement("div");
    catTabs.className = "explore-tabs";

    const content = document.createElement("div");
    content.className = "explore-content";

    function showCategory(ci) {
      _currentCatIdx = ci;
      setActiveTab(catTabs, ci);
      const cat = section.categories[ci];
      content.replaceChildren();
      const grid = document.createElement("div");
      grid.className = "explore-grid";

      for (const [linkIndex, link] of cat.links.entries()) {
        const card = document.createElement("a");
        card.className = "explore-site-card";
        card.href = link.url;
        card.target = "_blank";
        card.rel = "noopener noreferrer";

        if (isEditing) {
          card.classList.add("is-editing");
          card.draggable = true;

          // prevent navigation in edit mode
          card.addEventListener("click", (e) => {
            e.preventDefault();
          });

          // delete button
          const delBtn = document.createElement("button");
          delBtn.type = "button";
          delBtn.className = "explore-delete-btn";
          delBtn.textContent = "−";
          delBtn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            cat.links.splice(linkIndex, 1);
            rerenderCurrentView();
          });
          card.appendChild(delBtn);

          // drag-and-drop handlers
          card.addEventListener("dragstart", (e) => {
            e.dataTransfer.setData("text/plain", String(linkIndex));
            e.dataTransfer.effectAllowed = "move";
            card.classList.add("is-dragging");
          });

          card.addEventListener("dragend", () => {
            card.classList.remove("is-dragging");
            grid.querySelectorAll(".is-drag-over").forEach((el) => el.classList.remove("is-drag-over"));
          });

          card.addEventListener("dragover", (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            grid.querySelectorAll(".is-drag-over").forEach((el) => el.classList.remove("is-drag-over"));
            card.classList.add("is-drag-over");
          });

          card.addEventListener("dragleave", (e) => {
            if (!card.contains(e.relatedTarget)) {
              card.classList.remove("is-drag-over");
            }
          });

          card.addEventListener("drop", (e) => {
            e.preventDefault();
            card.classList.remove("is-drag-over");
            const fromIndex = parseInt(e.dataTransfer.getData("text/plain"), 10);
            if (isNaN(fromIndex) || fromIndex === linkIndex) return;
            // swap positions
            [cat.links[fromIndex], cat.links[linkIndex]] = [cat.links[linkIndex], cat.links[fromIndex]];
            rerenderCurrentView();
          });
        }

        const img = document.createElement("img");
        img.className = "explore-favicon";
        img.src = faviconUrl(link.url);
        img.alt = "";
        img.loading = "lazy";
        img.addEventListener("error", () => {
          img.src = FALLBACK_FAVICON;
        });

        const name = document.createElement("span");
        name.className = "explore-site-name";
        name.textContent = link.name;

        card.append(img, name);
        grid.appendChild(card);
      }

      // add-card button (edit mode)
      if (isEditing) {
        const addCard = document.createElement("button");
        addCard.type = "button";
        addCard.className = "explore-add-card";
        addCard.textContent = "+";
        addCard.addEventListener("click", () => showAddDialog());
        grid.appendChild(addCard);
      }

      content.appendChild(grid);
    }

    _showCategory = showCategory;

    for (const [i, cat] of section.categories.entries()) {
      const tab = document.createElement("button");
      tab.type = "button";
      tab.className = "explore-tab";
      tab.textContent = cat.name;
      tab.addEventListener("click", () => {
        showCategory(i);
      });
      catTabs.appendChild(tab);
    }

    showCategory(0);
    body.append(catTabs, content);
  }

  // build section tabs
  for (const [i, section] of data.entries()) {
    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = "explore-section-tab";
    tab.textContent = section.title;
    if (!section.categories || section.categories.length === 0) {
      tab.classList.add("is-disabled");
    } else {
      tab.addEventListener("click", () => showSection(i));
    }
    if (i === _currentSectionIdx) tab.classList.add("is-active");
    sectionTabs.appendChild(tab);
  }

  exploreModules.append(sectionTabs);
  showSection(_currentSectionIdx);
}

// ---------- Open / close ----------

async function openExplorePanel() {
  setExploreOpen(true);

  if (!exploreModules.children.length) {
    const data = await loadNavData();
    renderExploreModules(data);
  }
}

function toggleExplorePanel() {
  if (explorePanel.hidden) {
    openExplorePanel();
    if (!historyPanel.hidden) setHistoryOpen(false);
  } else {
    closeExplorePanel();
  }
}

function closeExplorePanel() {
  if (isEditing) {
    showConfirmDialog("是否保存更改？", {
      onConfirm: () => {
        saveNavDataToStorage(navData);
        resetEditUI();
        setExploreOpen(false);
      },
    });
    return;
  }
  setExploreOpen(false);
}

exploreToggle.addEventListener("click", toggleExplorePanel);

// ---------- History panel ----------

// click outside → close any open panel / menu
document.addEventListener("click", (event) => {
  if (
    !historyPanel.hidden &&
    !historyPanel.contains(event.target) &&
    !historyToggle.contains(event.target)
  ) {
    setHistoryOpen(false);
  }
  if (
    !bgMenu.hidden &&
    !bgMenu.contains(event.target) &&
    !bgSettingsBtn.contains(event.target)
  ) {
    closeBgMenu();
  }
  if (
    !explorePanel.hidden &&
    !explorePanel.contains(event.target) &&
    !exploreToggle.contains(event.target)
  ) {
    closeExplorePanel();
  }
});

loadBackground();
renderPinnedChips();

initSubtitleTicker(document.getElementById("subtitle-line"));
updateHistoryLayoutToggle();
