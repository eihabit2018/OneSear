// ---------- Lunar calendar & solar terms (pure JS, no deps) ----------

const STEMS = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
const BRANCHES = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
const ZODIACS = ["鼠","牛","虎","兔","龙","蛇","马","羊","猴","鸡","狗","猪"];
const LUNAR_MONTHS = ["正","二","三","四","五","六","七","八","九","十","冬","腊"];
const LUNAR_DAYS = [
  "初一","初二","初三","初四","初五","初六","初七","初八","初九","初十",
  "十一","十二","十三","十四","十五","十六","十七","十八","十九","二十",
  "廿一","廿二","廿三","廿四","廿五","廿六","廿七","廿八","廿九","三十"
];
const WEEKDAYS = ["星期日","星期一","星期二","星期三","星期四","星期五","星期六"];
const SOLAR_TERMS = [
  "小寒","大寒","立春","雨水","惊蛰","春分","清明","谷雨",
  "立夏","小满","芒种","夏至","小暑","大暑","立秋","处暑",
  "白露","秋分","寒露","霜降","立冬","小雪","大雪","冬至"
];

// ---------- Hardcoded lunar month start dates (Gregorian) for recent years ----------
// Each entry: [gregorian_date, lunar_month_number, is_leap]
// gregorian_date is days since Jan 1 of that year (0 = Jan 1)
// Stem-branch year: 2024=甲辰, 2025=乙巳, 2026=丙午, 2027=丁未
const LUNAR_MONTH_STARTS = {
  2024: [
    [39, 1, false],  // Feb 10 = day 40 → day 39 (0-indexed: Jan has 31 days, so Feb 10 = 31+9 = 40... wait)
    // Actually let me use a simpler format: [month, day, lunar_month, is_leap]
  ],
};

// Simpler: encode lunar new year dates and month sizes explicitly
// lunarYearDays[year] = [isLeap(bool), leapMonth, sizeM1, sizeM2, ..., sizeM12, sizeLeap if any]
const LUNAR_YEARS = {
  2024: { newYear: [1, 10], leap: 0, sizes: [30,30,29,29,30,29,30,29,30,30,29,30] },
  2025: { newYear: [1, 29], leap: 6, sizes: [30,29,30,29,29,30,30,29,30,30,29,30], leapSize: 29 },
  2026: { newYear: [2, 17], leap: 0, sizes: [30,29,30,29,29,30,29,29,30,30,30,29] },
  2027: { newYear: [2, 6],  leap: 0, sizes: [30,30,29,30,29,29,30,29,30,29,30,29] },
};

function daysInYear(y) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 366 : 365;
}

function monthDayToDayOfYear(y, m, d) {
  // m=1..12, d=1..31 — returns day of year (0 = Jan 1)
  const cum = [0,31,59,90,120,151,181,212,243,273,304,334];
  let doy = cum[m - 1] + d - 1;
  if (m > 2 && daysInYear(y) === 366) doy++;
  return doy;
}

function dayOfYearToDate(y, doy) {
  let m = 0;
  const cum = [0,31,59,90,120,151,181,212,243,273,304,334];
  const isLeap = daysInYear(y) === 366;
  for (let i = 0; i < 12; i++) {
    let limit = cum[i];
    if (i > 1 && isLeap) limit++;
    if (doy < limit) { m = i; break; }
    m = i + 1;
  }
  let monthStart = cum[m - 1] || 0;
  if (m > 2 && isLeap) monthStart++;
  const day = doy - monthStart + 1;
  return { month: m, day };
}

function getLunarYearInfo(gregYear) {
  // find which lunar year contains this gregorian year
  for (let ly = gregYear; ly >= 2024; ly--) {
    if (LUNAR_YEARS[ly]) return { lunarYear: ly, info: LUNAR_YEARS[ly] };
  }
  return { lunarYear: gregYear, info: LUNAR_YEARS[2026] };
}

// ---------- Public API ----------

export function getDayOfWeek(date) {
  return WEEKDAYS[date.getDay()];
}

function daysBetween(y1, m1, d1, y2, m2, d2) {
  // days from date1 to date2 (date1 not included, date2 included)
  let count = monthDayToDayOfYear(y2, m2, d2);
  if (y1 === y2) {
    return count - monthDayToDayOfYear(y1, m1, d1);
  }
  // add days remaining in y1
  count += daysInYear(y1) - monthDayToDayOfYear(y1, m1, d1);
  // add full years between
  for (let y = y1 + 1; y < y2; y++) count += daysInYear(y);
  return count;
}

export function getLunarDate(date) {
  const gy = date.getFullYear();
  const gm = date.getMonth() + 1;
  const gd = date.getDate();

  // Try the lunar year that starts in this gregorian year,
  // or the previous gregorian year
  for (const ly of [gy, gy - 1, gy - 2]) {
    const info = LUNAR_YEARS[ly];
    if (!info) continue;
    const [nym, nyd] = info.newYear;
    const offset = daysBetween(ly, nym, nyd, gy, gm, gd);
    if (offset < 0) continue; // lunar year hasn't started yet
    if (offset >= info.sizes.reduce((a,b)=>a+b,0) + (info.leap ? info.leapSize : 0)) continue; // next lunar year

    // OK, we're in lunar year `ly`
    const stemIdx = (ly + 6) % 10;
    const branchIdx = (ly + 8) % 12;
    const stemBranch = STEMS[stemIdx] + BRANCHES[branchIdx];
    const zodiac = ZODIACS[branchIdx];

    let remaining = offset;
    for (let lm = 1; lm <= 12; lm++) {
      const size = info.sizes[lm - 1];
      if (remaining < size) {
        return {
          year: ly,
          month: lm,
          day: remaining + 1,
          isLeap: false,
          monthName: LUNAR_MONTHS[lm - 1],
          dayName: LUNAR_DAYS[remaining],
          stemBranch,
          zodiac,
        };
      }
      remaining -= size;
      if (info.leap === lm && info.leapSize) {
        if (remaining < info.leapSize) {
          return {
            year: ly,
            month: lm,
            day: remaining + 1,
            isLeap: true,
            monthName: "闰" + LUNAR_MONTHS[lm - 1],
            dayName: LUNAR_DAYS[remaining],
            stemBranch,
            zodiac,
          };
        }
        remaining -= info.leapSize;
      }
    }
  }

  // Fallback
  return { year: gy, month: gm, day: gd, isLeap: false, monthName: "", dayName: "", stemBranch: "", zodiac: "" };
}

// ---------- Solar terms ----------

// 2026 solar terms: [month, day] pairs for each of 24 terms
const SOLAR_TERM_DATES = {
  2026: [
    [1,5],[1,20],[2,4],[2,18],[3,5],[3,20],[4,4],[4,20],
    [5,5],[5,21],[6,5],[6,21],[7,7],[7,22],[8,7],[8,23],
    [9,7],[9,23],[10,8],[10,23],[11,7],[11,22],[12,7],[12,21]
  ],
  2027: [
    [1,5],[1,20],[2,3],[2,18],[3,6],[3,21],[4,5],[4,20],
    [5,5],[5,21],[6,5],[6,21],[7,7],[7,23],[8,7],[8,23],
    [9,8],[9,23],[10,8],[10,23],[11,7],[11,22],[12,7],[12,22]
  ],
};

export function getNextSolarTerm(date) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();

  const terms = SOLAR_TERM_DATES[y];
  if (!terms) {
    // approximate
    return { name: "小寒", date: new Date(y + 1, 0, 5), daysUntil: 999 };
  }

  for (let i = 0; i < 24; i++) {
    const [tm, td] = terms[i];
    if (tm > m || (tm === m && td >= d)) {
      const termDate = new Date(y, tm - 1, td);
      const daysUntil = Math.ceil((termDate - date) / 86400000);
      return { name: SOLAR_TERMS[i], date: termDate, daysUntil };
    }
  }

  // first term of next year
  const nextTerms = SOLAR_TERM_DATES[y + 1];
  if (nextTerms) {
    const termDate = new Date(y + 1, nextTerms[0][0] - 1, nextTerms[0][1]);
    const daysUntil = Math.ceil((termDate - date) / 86400000);
    return { name: SOLAR_TERMS[0], date: termDate, daysUntil };
  }

  return { name: "小寒", date: new Date(y + 1, 0, 5), daysUntil: 999 };
}

// ---------- Holidays ----------

const HOLIDAYS = [
  [2026,1,1,"元旦"],[2026,2,17,"春节"],[2026,4,5,"清明节"],
  [2026,5,1,"劳动节"],[2026,6,19,"端午节"],[2026,9,25,"中秋节"],
  [2026,10,1,"国庆节"],
  [2027,1,1,"元旦"],[2027,2,6,"春节"],[2027,4,5,"清明节"],
  [2027,5,1,"劳动节"],[2027,6,9,"端午节"],[2027,9,15,"中秋节"],
  [2027,10,1,"国庆节"],
  [2028,1,1,"元旦"],
];

export function getNextHoliday(date) {
  let best = null;
  for (const [y, m, d, name] of HOLIDAYS) {
    const hDate = new Date(y, m - 1, d);
    if (hDate > date) {
      if (!best || hDate < best.date) {
        const daysUntil = Math.ceil((hDate - date) / 86400000);
        best = { name, date: hDate, daysUntil };
      }
    }
  }
  return best;
}

export function getNextEvent(date) {
  const term = getNextSolarTerm(date);
  const holiday = getNextHoliday(date);

  if (!holiday) return { ...term, type: "term" };
  if (term.daysUntil <= holiday.daysUntil) return { ...term, type: "term" };
  return { ...holiday, type: "holiday" };
}
