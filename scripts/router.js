const PROVIDERS = [
  {
    id: "baidu",
    name: "百度",
    aliases: ["百度", "baidu"],
    buildUrl(query) {
      return `https://www.baidu.com/s?wd=${encodeURIComponent(query)}`;
    },
  },
  {
    id: "google",
    name: "Google",
    aliases: ["google", "谷歌", "gg"],
    buildUrl(query) {
      return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    },
  },
  {
    id: "bilibili",
    name: "哔哩哔哩",
    aliases: ["bilibili", "b站", "哔哩哔哩", "bili"],
    buildUrl(query) {
      return `https://search.bilibili.com/all?keyword=${encodeURIComponent(query)}`;
    },
  },
  {
    id: "youtube",
    name: "YouTube",
    aliases: ["youtube", "yt", "油管"],
    buildUrl(query) {
      return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    },
  },
  {
    id: "github",
    name: "GitHub",
    aliases: ["github", "gh"],
    buildUrl(query) {
      return `https://github.com/search?q=${encodeURIComponent(query)}&type=repositories`;
    },
  },
  {
    id: "stackoverflow",
    name: "Stack Overflow",
    aliases: ["stackoverflow", "stack overflow", "so"],
    buildUrl(query) {
      return `https://stackoverflow.com/search?q=${encodeURIComponent(query)}`;
    },
  },
  {
    id: "taobao",
    name: "淘宝",
    aliases: ["淘宝", "taobao", "tb"],
    buildUrl(query) {
      return `https://s.taobao.com/search?q=${encodeURIComponent(query)}`;
    },
  },
  {
    id: "jd",
    name: "京东",
    aliases: ["京东", "jd"],
    buildUrl(query) {
      return `https://search.jd.com/Search?keyword=${encodeURIComponent(query)}`;
    },
  },
  {
    id: "amap",
    name: "高德地图",
    aliases: ["高德", "高德地图", "amap", "地图"],
    buildUrl(query) {
      return `https://www.amap.com/search?query=${encodeURIComponent(query)}`;
    },
  },
  {
    id: "scholar",
    name: "Google Scholar",
    aliases: ["scholar", "google scholar", "学术", "论文"],
    buildUrl(query) {
      return `https://scholar.google.com/scholar?q=${encodeURIComponent(query)}`;
    },
  },
  {
    id: "wiki",
    name: "维基百科",
    aliases: ["wiki", "wikipedia", "维基", "维基百科", "百科"],
    buildUrl(query) {
      return `https://zh.wikipedia.org/w/index.php?search=${encodeURIComponent(query)}`;
    },
  },
  {
    id: "translate",
    name: "Google 翻译",
    aliases: ["translate", "翻译", "fanyi"],
    buildUrl(query) {
      return `https://translate.google.com/?sl=auto&tl=auto&text=${encodeURIComponent(query)}&op=translate`;
    },
  },
  {
    id: "images",
    name: "Google 图片",
    aliases: ["images", "图片", "image", "google图片"],
    buildUrl(query) {
      return `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`;
    },
  },
];

const ALIAS_INDEX = PROVIDERS.flatMap((provider) =>
  provider.aliases.map((alias) => ({
    alias: alias.toLowerCase(),
    provider,
  })),
);

// ---------- Lookup ----------

export function findProviderByAlias(rawAlias) {
  const alias = rawAlias.trim().toLowerCase();
  if (!alias) {
    return null;
  }

  const exact = ALIAS_INDEX.find((item) => item.alias === alias);
  if (exact) {
    return exact.provider;
  }

  let startsWithMatch = null;
  for (const item of ALIAS_INDEX) {
    if (item.alias.startsWith(alias)) {
      if (startsWithMatch) {
        return null;
      }
      startsWithMatch = item;
    }
  }
  if (startsWithMatch) {
    return startsWithMatch.provider;
  }

  return null;
}

export function findProviderById(id) {
  return PROVIDERS.find((p) => p.id === id) ?? null;
}

export function filterProviders(rawFilter) {
  const filter = rawFilter.trim().toLowerCase();
  if (!filter) {
    return PROVIDERS;
  }

  return PROVIDERS.filter((provider) =>
    provider.aliases.some((alias) => alias.toLowerCase().includes(filter)),
  );
}

export const MENTION_PATTERN = /@([\w\u4e00-\u9fff.-]+)/g;

export function parseMentionInput(rawInput) {
  const input = rawInput.trim();
  if (!input) {
    return { ok: false, error: "empty_input" };
  }

  const mentions = [...input.matchAll(MENTION_PATTERN)];
  if (mentions.length === 0) {
    return { ok: false, error: "no_mention", input };
  }

  const unknownMentions = [];
  const resolved = [];
  const seenIds = new Set();

  for (const mention of mentions) {
    const provider = findProviderByAlias(mention[1]);
    if (!provider) {
      unknownMentions.push(mention[1]);
      continue;
    }
    if (!seenIds.has(provider.id)) {
      seenIds.add(provider.id);
      resolved.push({ provider, mention: mention[1] });
    }
  }

  if (unknownMentions.length > 0) {
    return {
      ok: false,
      error: "unknown_provider",
      mention: unknownMentions[0],
      unknownMentions,
      input,
    };
  }

  if (resolved.length === 0) {
    return { ok: false, error: "no_mention", input };
  }

  const query = input.replace(MENTION_PATTERN, "").replace(/\s+/g, " ").trim();

  if (!query) {
    return {
      ok: false,
      error: "empty_query",
      providers: resolved.map((item) => item.provider),
      input,
    };
  }

  const targets = resolved.map(({ provider, mention }) => ({
    provider,
    mention,
    url: provider.buildUrl(query),
  }));

  return {
    ok: true,
    query,
    targets,
    provider: targets[0].provider,
    url: targets[0].url,
  };
}

export function getActiveMentionFilter(value, caretIndex) {
  const beforeCaret = value.slice(0, caretIndex);
  const atIndex = beforeCaret.lastIndexOf("@");
  if (atIndex === -1) {
    return null;
  }

  const fragment = beforeCaret.slice(atIndex + 1);
  if (/\s/.test(fragment)) {
    return null;
  }

  return {
    atIndex,
    filter: fragment,
  };
}

export { PROVIDERS };
