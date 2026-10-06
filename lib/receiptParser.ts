// 把付款截图经 iPhone「从图像中提取文本」得到的文字，解析成一笔交易。
// 纯函数、无依赖：服务端 /api/capture 和设置页的「测试识别」都用它。
import { identifyMerchant } from "@/lib/brands";

export type ParsedReceipt = {
  /** 金额，单位是下面的 currency（不一定是马币） */
  amount: number | null;
  /** MYR，或截图上的外币代码（USD、USDT、SGD…） */
  currency: string;
  /** 截图同时写了马币和外币时，这里是外币那一边，仅供对账 */
  original: { amount: number; currency: string } | null;
  merchant: string | null;
  categoryLabel: string;
  /**
   * 分类拿不准，应该问用户：
   * - "unknown"：银行没标分类，商家也认不出（路边摊、个人收款…）。用户选了之后会记住这个商家。
   * - "mixed"：认得这家店，但它什么都卖（超市、百货、网购）。每次都问，不记住。
   * - null：有把握，不用问。
   */
  ask: "unknown" | "mixed" | null;
  occurredOn: string | null; // YYYY-MM-DD
};

const AMOUNT_KEYWORDS = /(amount|total|paid|payment|jumlah|金额|总额|实付|付款|charged)/i;
const MERCHANT_KEYWORDS =
  /^(pay to|paid to|transfer to|to|merchant|merchant name|payment details|recipient|receiver|收款方|商家|收款人|penerima)(?=\s|:|：|$)\s*[:：]?\s*/i;

// 分类只有：衣 食 住 行 + 其他支出（label 必须和 categories 表的 label_zh 一致）。

// 1) 银行 App 自己标的分类（截图里 Category 那一行，例如 “Food & Drink ›”）最可靠，优先用。
const BANK_CATEGORY_RULES: [RegExp, string][] = [
  [/food\s*&?\s*drink|dining|restaurant|groceries|grocery|food/i, "食"],
  [/petrol|fuel|transport|travel|parking|toll|ride/i, "行"],
  [/shopping|fashion|clothing|apparel/i, "衣"],
  [/bills?|utilities|rent|housing|home|household/i, "住"],
];

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
  mei: 5, ogos: 8, okt: 10, dis: 12,
};

function toNumber(raw: string): number {
  return Number(raw.replace(/[,\s]/g, ""));
}

// 认得的货币写法 → 标准代码。稳定币（USDT/USDC）按 1:1 当作 USD 来换算。
const CURRENCY_ALIASES: [string, string][] = [
  ["USDT", "USDT"], ["USDC", "USDC"], ["US\\$", "USD"], ["USD", "USD"],
  ["MYR", "MYR"], ["RM", "MYR"],
  ["SGD", "SGD"], ["S\\$", "SGD"], ["HKD", "HKD"], ["HK\\$", "HKD"], ["AUD", "AUD"], ["A\\$", "AUD"],
  ["TWD", "TWD"], ["NT\\$", "TWD"], ["EUR", "EUR"], ["€", "EUR"], ["GBP", "GBP"], ["£", "GBP"],
  ["JPY", "JPY"], ["CNY", "CNY"], ["RMB", "CNY"], ["¥", "CNY"], ["￥", "CNY"],
  ["THB", "THB"], ["฿", "THB"], ["IDR", "IDR"], ["Rp", "IDR"], ["VND", "VND"], ["₫", "VND"],
  ["KRW", "KRW"], ["₩", "KRW"], ["PHP", "PHP"], ["₱", "PHP"], ["INR", "INR"], ["₹", "INR"],
  ["\\$", "USD"], // 单独一个 $ 当作美元，要放最后
];
const TOKEN = CURRENCY_ALIASES.map(([alias]) => alias).join("|");
const NUM = "[\\d][\\d.,]*";
// 货币在前（USD 10.00、-RM 20.00）或在后（10.00 USDT）。字母写法前后不能紧贴别的字母，免得把 FARM 读成 RM。
const MONEY_RE = new RegExp(
  `(?<![A-Za-z])(${TOKEN})\\s*-?\\s*(${NUM})|(${NUM})\\s*(${TOKEN})(?![A-Za-z])`,
  "gi",
);

function currencyCode(token: string): string {
  const t = token.toUpperCase();
  const hit = CURRENCY_ALIASES.find(([alias]) => alias.replace(/\\/g, "").toUpperCase() === t);
  return hit ? hit[1] : "MYR";
}

function toAmount(raw: string, currency: string): number {
  const cleaned = raw.replace(/[.,]+$/, "");
  // 印尼盾、越南盾没有小数，点和逗号都是千位分隔（Rp 25.000）
  if (currency === "IDR" || currency === "VND") return Number(cleaned.replace(/[.,]/g, ""));
  return toNumber(cleaned);
}

// 整行就是一个金额（“-RM 20.00”、“10.00 USDT”），银行详情页里它的下一行通常是商家
const AMOUNT_LINE_RE = new RegExp(`^[-+]?\\s*(?:(?:${TOKEN})\\s*-?\\s*${NUM}|${NUM}\\s*(?:${TOKEN}))$`, "i");

type Money = { amount: number; currency: string };

/** 找出这笔交易的金额。有马币就用马币（银行已经换算好了）；只有外币时返回外币，交给服务器按汇率换算。 */
function findMoney(lines: string[]): { main: Money | null; original: Money | null } {
  const candidates: (Money & { score: number; index: number })[] = [];

  lines.forEach((line, index) => {
    for (const match of line.matchAll(MONEY_RE)) {
      const currency = currencyCode(match[1] ?? match[4]);
      const amount = toAmount(match[2] ?? match[3], currency);
      if (!Number.isFinite(amount) || amount <= 0) continue;
      let score = 1;
      if (AMOUNT_KEYWORDS.test(line) || AMOUNT_KEYWORDS.test(lines[index - 1] ?? "")) score += 3;
      if (/balance|baki|余额|limit|cashback|reward|points|available/i.test(line)) score -= 3;
      if (/\bfee\b|gas|network|手续费|rate|汇率/i.test(line)) score -= 2;
      candidates.push({ amount, currency, score, index });
    }
  });

  // 完全没写货币的情况：找带关键词那一行里的小数，当作马币
  if (candidates.length === 0) {
    lines.forEach((line, index) => {
      if (!AMOUNT_KEYWORDS.test(line)) return;
      const match = line.match(/([\d,]+\.\d{2})/);
      if (match) candidates.push({ amount: toNumber(match[1]), currency: "MYR", score: 1, index });
    });
  }

  candidates.sort((a, b) => b.score - a.score || a.index - b.index);
  const pick = (c: (typeof candidates)[number] | undefined): Money | null =>
    c ? { amount: c.amount, currency: c.currency } : null;
  const myr = candidates.find((c) => c.currency === "MYR" && c.score > 0);
  const foreign = candidates.find((c) => c.currency !== "MYR" && c.score > 0);

  if (myr) return { main: pick(myr), original: pick(foreign) };
  if (foreign) return { main: pick(foreign), original: null };
  return { main: pick(candidates[0]), original: null };
}

function looksLikeNoise(line: string): boolean {
  return (
    line.length < 3 ||
    /\b(RM|MYR|USD|USDT|USDC|SGD|EUR|GBP)\s*-?\s*\d|\d\s*(USD|USDT|USDC|SGD|EUR|GBP)\b|[$€£¥]\s*\d|\d{1,2}[:.]\d{2}\s*(am|pm)?$|successful|success|berjaya|成功|completed|pending|receipt|reference|ref\s*no|transaction|\bdate\b|\btime\b|status|wallet|account|\bID\b/i.test(
      line,
    ) ||
    /^[\d\s\-:/.,]+$/.test(line) ||
    /^(details?|transaction details?|receipt|activity|home|profile|transfer|new|share)$/i.test(line.trim())
  );
}

// 像 261004D9D80AF5S 这种参考编号：没有空格、字母数字混在一起、数字很多
function looksLikeReference(line: string): boolean {
  const t = line.replace(/^[^A-Za-z0-9]+/, "").trim();
  return /^[A-Z0-9|]{8,}$/i.test(t) && (t.match(/\d/g)?.length ?? 0) >= 5;
}

function findMerchant(lines: string[]): string | null {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (MERCHANT_KEYWORDS.test(line)) {
      const rest = line.replace(MERCHANT_KEYWORDS, "").trim();
      if (rest.length >= 2) return rest;
      // Touch 'n Go 的明细是 “Payment Details / Payment - Parking” 这种：去掉前面的 “Payment - ”
      const next = lines[i + 1]?.trim().replace(/^(payment|bayaran)\s*[-–:]\s*/i, "");
      if (next && !looksLikeNoise(next)) return next;
    }
  }
  // 银行交易详情常见排版：金额下面一行就是商家（例如 “-RM 20.00” 下一行 “Setel”）
  const amountIndex = lines.findIndex((l) => AMOUNT_LINE_RE.test(l));
  const afterAmount = amountIndex >= 0 ? lines[amountIndex + 1]?.trim() : undefined;
  if (afterAmount && !looksLikeNoise(afterAmount) && !looksLikeReference(afterAmount) && /\p{L}{2,}/u.test(afterAmount)) {
    return afterAmount;
  }
  const company = lines.find((l) => /(sdn\.?\s*bhd|bhd|enterprise|trading|restoran|store|mart)/i.test(l));
  if (company) return company.trim();
  // 退一步：第一行看起来像店名的（多为大写字母）
  const upper = lines.find(
    (l) => !looksLikeNoise(l) && !looksLikeReference(l) && /^[A-Z0-9&'.\- ]{3,}$/.test(l.trim()),
  );
  if (upper) return upper.trim();
  const first = lines.find(
    (l) => !looksLikeNoise(l) && !looksLikeReference(l) && /\p{L}/u.test(l) && l.length <= 40,
  );
  return first?.trim() ?? null;
}

function findDate(text: string, today: Date): string | null {
  const pad = (n: number) => String(n).padStart(2, "0");
  const build = (y: number, m: number, d: number) => {
    if (y < 100) y += 2000;
    const date = new Date(y, m - 1, d);
    if (date.getMonth() !== m - 1 || date > today) return null;
    return `${y}-${pad(m)}-${pad(d)}`;
  };

  let m = text.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return build(+m[1], +m[2], +m[3]);
  m = text.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/); // 马来西亚习惯 dd/mm/yyyy
  if (m) return build(+m[3], +m[2], +m[1]);
  m = text.match(/\b(\d{1,2})\s+([A-Za-z]{3})[a-z]*\s+(\d{4})\b/);
  if (m && MONTHS[m[2].toLowerCase()]) return build(+m[3], MONTHS[m[2].toLowerCase()], +m[1]);
  m = text.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (m) return build(+m[1], +m[2], +m[3]);
  return null;
}

/** 截图里银行自己标的分类（Category 那一行，例如 “Food & Drink ›”），没有就返回 null */
function bankCategory(text: string): string | null {
  // 银行的分类标签是一行以 › 或 > 结尾的短字（OCR 可能在前面带个图标乱码）
  const chips = text
    .split(/\r?\n/)
    .filter((l) => /[›>]\s*$/.test(l) && l.length <= 30)
    .map((l) => l.replace(/[›>]\s*$/, ""));
  for (const chip of chips) {
    for (const [re, label] of BANK_CATEGORY_RULES) if (re.test(chip)) return label;
  }
  return null;
}

/**
 * 分类的优先顺序：银行自己标的分类 → 内置品牌名单 / 店名里的字眼 → 其他支出。
 * （用户改过分类的商家优先级最高，那一步在数据库的 capture_transaction 里做。）
 */
export function guessCategory(text: string, merchant: string | null = null): string {
  return bankCategory(text) ?? identifyMerchant(merchant)?.category ?? "其他支出";
}

function needsAsking(text: string, merchant: string | null): ParsedReceipt["ask"] {
  if (bankCategory(text)) return null; // 银行已经标了
  const known = identifyMerchant(merchant);
  if (!known) return "unknown";
  return known.askEveryTime ? "mixed" : null;
}

export function parseReceipt(text: string, today: Date = new Date()): ParsedReceipt {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const rawMerchant = findMerchant(lines);
  // 认得的品牌换成干净的名字（“MCDONALDS-SS15 DT 1010349” → “McDonald's”）
  const merchant = identifyMerchant(rawMerchant)?.name ?? rawMerchant;
  const money = findMoney(lines);
  return {
    amount: money.main?.amount ?? null,
    currency: money.main?.currency ?? "MYR",
    original: money.original,
    merchant,
    categoryLabel: guessCategory(text, rawMerchant),
    ask: needsAsking(text, rawMerchant),
    occurredOn: findDate(text, today),
  };
}

// ======================================================================
// 一张截图里有好几笔交易（银行 App 的活动 / 交易记录列表）
// ======================================================================

export type ListEntry = {
  amount: number;
  merchant: string | null;
  categoryLabel: string;
  ask: ParsedReceipt["ask"];
  occurredOn: string | null; // 列表里的日期标题；读不到就是 null（当作今天）
};

// 任何金额（不管正负）。MONEY_RE 带 g 旗标，.test() 会记住位置，所以这里另做一个不带 g 的。
const ANY_MONEY_RE = new RegExp(MONEY_RE.source, "i");
// 支出的金额前面有减号：“-RM 6.00”。收入（+RM）和没有符号的不算。
const DEBIT_RE = new RegExp(`[-−–]\\s*(${TOKEN})\\s*(${NUM})|[-−–]\\s*(${NUM})\\s*(${TOKEN})(?![A-Za-z])`, "i");
// 只有“单笔交易详情”才会出现的栏位：看到就不是列表
const DETAIL_MARKERS =
  /^(reference id|transaction type|payment details|transaction no\.?|wallet ref|recipient reference|payment method|paid from|paid to|pay to)$/i;
// 每一行交易下面的小字（付款方式、状态、时间），不是商家名字
const SUBTITLE_RE =
  /^(duitnow|card|fpx|transfers?|payment|pending|completed|successful|success|debit|credit|e-?wallet|online|pos|qr|physical|virtual|main account|savings account|today|yesterday|今天|昨天|see all|view all|all|filter|search|activity|transactions?|history|spent|income|expenses?|money (in|out))\b/i;
const TIME_ONLY_RE = /^\d{1,2}[:.]\d{2}\s*(am|pm)?$/i;
const SUMMARY_RE = /total|spent|balance|baki|余额|available|总共|合计/i;

/** 单独一行的日期标题：“Today”、“5 Oct 2026”、“Mon, 5 Oct”、“05/10/2026” */
function headerDate(line: string, today: Date): string | null | undefined {
  const t = line.trim();
  if (t.length > 26 || DEBIT_RE.test(t)) return undefined;
  const pad = (n: number) => String(n).padStart(2, "0");
  const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  if (/^(today|今天|hari ini)$/i.test(t)) return iso(today);
  if (/^(yesterday|昨天|semalam)$/i.test(t)) return iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1));
  const full = findDate(t, today);
  if (full) return full;
  // 没写年份：“5 Oct”、“Mon, 5 Oct”、“Oct 5”。当作今年；如果那样会是未来，就是去年。
  const m = t.match(/^(?:[A-Za-z]{3,9},?\s+)?(\d{1,2})\s+([A-Za-z]{3})[a-z]*$/) ?? null;
  const m2 = t.match(/^(?:[A-Za-z]{3,9},?\s+)?([A-Za-z]{3})[a-z]*\s+(\d{1,2})$/) ?? null;
  const day = m ? +m[1] : m2 ? +m2[2] : null;
  const month = MONTHS[(m ? m[2] : m2 ? m2[1] : "").toLowerCase()];
  if (!day || !month) return undefined;
  let date = new Date(today.getFullYear(), month - 1, day);
  if (date > today) date = new Date(today.getFullYear() - 1, month - 1, day);
  return date.getMonth() === month - 1 ? iso(date) : undefined;
}

function isRowName(line: string, today: Date): boolean {
  const t = line.trim();
  return (
    /\p{L}{2,}/u.test(t) &&
    !SUBTITLE_RE.test(t) &&
    !TIME_ONLY_RE.test(t) &&
    !SUMMARY_RE.test(t) &&
    !looksLikeReference(t) &&
    !looksLikeNoise(t) &&
    headerDate(t, today) === undefined
  );
}

/**
 * 认出“列表”截图并拆成一笔一笔。不是列表（少于两笔支出，或是单笔详情页）时返回 null，
 * 调用方改用 parseReceipt。只认马币、且前面有减号的金额。
 */
export function parseReceiptList(text: string, today: Date = new Date()): ListEntry[] | null {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.some((l) => DETAIL_MARKERS.test(l))) return null;

  type Row = { index: number; amount: number; inline: string };
  const rows: Row[] = [];
  lines.forEach((line, index) => {
    if (SUMMARY_RE.test(line)) return;
    const match = line.match(DEBIT_RE);
    if (!match) return;
    const currency = currencyCode(match[1] ?? match[4]);
    if (currency !== "MYR") return;
    const amount = toAmount(match[2] ?? match[3], currency);
    if (!Number.isFinite(amount) || amount <= 0) return;
    // 名字和金额在同一行的排版：“Setel   -RM 20.00”
    rows.push({ index, amount, inline: line.slice(0, match.index).replace(/[\s·•|:-]+$/, "").trim() });
  });
  if (rows.length < 2) return null;

  // 一笔交易占几行。它的范围到“分界线”为止：别的金额（包括收入）、日期标题、合计那一行。
  const isBoundary = lines.map(
    (l) => ANY_MONEY_RE.test(l) || SUMMARY_RE.test(l) || headerDate(l, today) !== undefined,
  );
  const nameAbove = (r: Row) => {
    if (isRowName(r.inline, today)) return r.inline;
    let from = r.index;
    while (from > 0 && !isBoundary[from - 1]) from--;
    return lines.slice(from, r.index).find((l) => isRowName(l, today)) ?? null;
  };
  const nameBelow = (r: Row) => {
    let to = r.index + 1;
    while (to < lines.length && !isBoundary[to]) to++;
    return lines.slice(r.index + 1, to).find((l) => isRowName(l, today)) ?? null;
  };
  // 多数银行是“名字在上、金额在下”。第一笔上面没有名字、下面有，才是“金额在上”的排版。
  const amountFirst = nameAbove(rows[0]) === null && nameBelow(rows[0]) !== null;
  const names = rows.map(amountFirst ? nameBelow : nameAbove);

  // 日期标题管它下面的所有交易，直到下一个标题
  const dateAt = (index: number): string | null => {
    for (let i = index; i >= 0; i--) {
      const d = headerDate(lines[i], today);
      if (d) return d;
    }
    return null;
  };

  return rows.map((r, i) => {
    const raw = names[i];
    const known = identifyMerchant(raw);
    return {
      amount: r.amount,
      merchant: known?.name ?? raw,
      categoryLabel: known?.category ?? "其他支出",
      ask: !known ? "unknown" : known.askEveryTime ? "mixed" : null,
      occurredOn: dateAt(r.index),
    };
  });
}
