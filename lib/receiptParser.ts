// 把付款截图经 iPhone「从图像中提取文本」得到的文字，解析成一笔交易。
// 纯函数、无依赖：服务端 /api/capture 和设置页的「测试识别」都用它。

export type ParsedReceipt = {
  /** 金额，单位是下面的 currency（不一定是马币） */
  amount: number | null;
  /** MYR，或截图上的外币代码（USD、USDT、SGD…） */
  currency: string;
  /** 截图同时写了马币和外币时，这里是外币那一边，仅供对账 */
  original: { amount: number; currency: string } | null;
  merchant: string | null;
  categoryLabel: string;
  occurredOn: string | null; // YYYY-MM-DD
};

const AMOUNT_KEYWORDS = /(amount|total|paid|payment|jumlah|金额|总额|实付|付款|charged)/i;
const MERCHANT_KEYWORDS =
  /^(pay to|paid to|transfer to|to|merchant|recipient|receiver|收款方|商家|收款人|penerima)(?=\s|:|：|$)\s*[:：]?\s*/i;

// 分类只有：衣 食 住 行 + 其他支出（label 必须和 categories 表的 label_zh 一致）。

// 1) 银行 App 自己标的分类（截图里 Category 那一行，例如 “Food & Drink ›”）最可靠，优先用。
const BANK_CATEGORY_RULES: [RegExp, string][] = [
  [/food\s*&?\s*drink|dining|restaurant|groceries|grocery|food/i, "食"],
  [/petrol|fuel|transport|travel|parking|toll|ride/i, "行"],
  [/shopping|fashion|clothing|apparel/i, "衣"],
  [/bills?|utilities|rent|housing|home|household/i, "住"],
];

// 2) 没有银行分类时，按商家名字里的关键词猜。越具体的放越前面。
const CATEGORY_RULES: [RegExp, string][] = [
  [/grab\s*food|foodpanda|shopeefood|restoran|restaurant|cafe|café|kopitiam|mamak|bakery|mcdonald|kfc|starbucks|tealive|zus|chagee|nasi|mee\b|food|kitchen|bistro|dim sum|pancake|茶|饭|面|餐/i, "食"],
  [/setel|petronas|shell|petron|caltex|bhpetrol|petrol|grab|parking|\btoll\b|touch\s*'?n\s*go|\bmrt\b|\blrt\b|rapid|\bktm\b|airasia|\bbolt\b|maxim|油站|停车/i, "行"],
  [/\btnb\b|tenaga|unifi|maxis|celcom|\bdigi\b|umobile|u mobile|yes 5g|air selangor|indah water|syabas|astro|rental|\brent\b|ikea|mr\.? diy|电费|水费|房租/i, "住"],
  [/uniqlo|h&m|zara|padini|cotton on|nike|adidas|skechers|bata|shopee|lazada|tiktok shop|aeon|mydin|lotus|giant|jaya grocer|99 speedmart|kk mart|7-eleven|7 eleven|family\s*mart|daiso|\bmall\b|超市|商场|服饰/i, "衣"],
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
    /^[\d\s\-:/.,]+$/.test(line)
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
      const next = lines[i + 1]?.trim();
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

export function guessCategory(text: string, merchant: string | null = null): string {
  // 银行的分类标签是一行以 › 或 > 结尾的短字（OCR 可能在前面带个图标乱码）
  const chips = text
    .split(/\r?\n/)
    .filter((l) => /[›>]\s*$/.test(l) && l.length <= 30)
    .map((l) => l.replace(/[›>]\s*$/, ""));
  for (const chip of chips) {
    for (const [re, label] of BANK_CATEGORY_RULES) if (re.test(chip)) return label;
  }
  if (merchant) {
    for (const [re, label] of CATEGORY_RULES) if (re.test(merchant)) return label;
  }
  return "其他支出";
}

export function parseReceipt(text: string, today: Date = new Date()): ParsedReceipt {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const merchant = findMerchant(lines);
  const money = findMoney(lines);
  return {
    amount: money.main?.amount ?? null,
    currency: money.main?.currency ?? "MYR",
    original: money.original,
    merchant,
    categoryLabel: guessCategory(text, merchant),
    occurredOn: findDate(text, today),
  };
}
