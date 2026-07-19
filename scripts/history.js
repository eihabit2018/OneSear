const STORAGE_KEY = "one-search-history";
const MAX_ITEMS = 50;

function loadAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAll(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
}

function providerKey(providers) {
  return providers
    .map((p) => p.id)
    .sort()
    .join(",");
}

export function getSearchHistory() {
  return loadAll();
}

export function addSearchHistory({ query, providers, rawInput }) {
  const items = loadAll();
  const entry = {
    id: crypto.randomUUID(),
    query,
    providers: providers.map((p) => ({ id: p.id, name: p.name })),
    rawInput,
    createdAt: Date.now(),
  };

  const key = `${query}::${providerKey(entry.providers)}`;
  const filtered = items.filter(
    (item) => `${item.query}::${providerKey(item.providers)}` !== key,
  );

  saveAll([entry, ...filtered]);
  return entry;
}

export function removeSearchHistory(id) {
  const items = loadAll().filter((item) => item.id !== id);
  saveAll(items);
  return items;
}

export function clearSearchHistory() {
  saveAll([]);
  return [];
}
