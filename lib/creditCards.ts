// 信用卡推荐数据 — 马来西亚主要银行信用卡精选
// 资料整理自银行官网 + RinggitPlus / rates.my / comparehero 等公开比较平台，
// 逐张卡对照银行官网复核，最后核实时间见 DATA_LAST_VERIFIED。
// 银行年费、回扣细则、门槛随时可能调整，最终以银行官网/官方T&C为准，本工具不构成正式财务建议。

export const DATA_LAST_VERIFIED = "2026年8月30日";

export type SpendingFocus =
  | "grocery_daily"
  | "online_shopping"
  | "dining"
  | "petrol"
  | "travel"
  | "mixed";

export type Priority =
  | "max_cashback"
  | "no_annual_fee"
  | "travel_miles"
  | "simple_low_effort";

export const SPENDING_FOCUS_LABELS: Record<SpendingFocus, string> = {
  grocery_daily: "日常生活 / 超市",
  online_shopping: "网购",
  dining: "餐饮外食",
  petrol: "加油 / 交通",
  travel: "旅行 / 差旅",
  mixed: "比较平均，没有特别集中",
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  max_cashback: "现金回扣越高越好",
  no_annual_fee: "完全不想付年费",
  travel_miles: "累积里程 / 机场贵宾室等旅行福利",
  simple_low_effort: "简单好用，条件/门槛越少越好",
};

export interface CreditCardOption {
  id: string;
  bank: string;
  name: string;
  annualFee: number;
  feeWaiverNote: string;
  feeWaiverEasy: boolean;
  // 年费豁免所需的年度刷卡消费门槛（RM）。只在银行官网明确写了具体金额时才填，
  // 用来跟用户的月支出 × 12 比较，判断这张卡的年费实际上豁不豁得掉。
  feeWaiverAnnualSpend?: number;
  minMonthlyIncome: number;
  focus: SpendingFocus[];
  priorityFit: Priority[];
  headline: string;
  pros: string[];
  cons: string[];
  sourceUrl: string;
  // 现金回扣卡才有：最高回扣率、每月回扣上限（RM）。只在有把握的数字才填，
  // 用来估算「以你的月支出，这张卡大概每月能拿回多少钱」。
  cashbackRate?: number;
  monthlyCashbackCap?: number;
}

export const CREDIT_CARDS: CreditCardOption[] = [
  {
    id: "uob-simple",
    bank: "UOB",
    name: "Simple Card",
    annualFee: 0,
    feeWaiverNote: "终身免年费",
    feeWaiverEasy: true,
    minMonthlyIncome: 2000,
    focus: ["mixed", "grocery_daily"],
    priorityFit: ["no_annual_fee", "simple_low_effort", "max_cashback"],
    headline: "入门首选：免年费 + 多类别现金回扣",
    pros: [
      "餐饮、超市、网购等多类别最高约10%现金回扣",
      "终身免年费，门槛低，无需刷卡次数才能豁免",
      "申请门槛低，适合刚开始用卡的人",
    ],
    cons: [
      "回扣有月度上限，消费超过上限后不再有回扣",
      "单一类别回扣率不算全场最高，比不上专攻单一类别的卡（如油站/网购专用卡）",
    ],
    sourceUrl: "https://ringgitplus.com/en/credit-card/no-annual-fee/",
  },
  {
    id: "maybank-2-gold",
    bank: "Maybank",
    name: "2 Gold Card",
    annualFee: 0,
    feeWaiverNote: "终身免年费",
    feeWaiverEasy: true,
    minMonthlyIncome: 2500,
    focus: ["mixed", "travel"],
    priorityFit: ["no_annual_fee", "simple_low_effort", "travel_miles"],
    headline: "周末消费5%回扣，门槛低，也是入门级里程卡",
    pros: [
      "周末（六、日）几乎全类别消费最高5%现金回扣（政府机构/水电费等除外）",
      "终身免年费",
      "TreatsPoints 也可日后转换部分航空里程",
    ],
    cons: [
      "5%回扣只限周末，平日消费没有额外回扣",
      "里程转换比率较低，不适合以里程为主要目标的人",
    ],
    sourceUrl: "https://rates.my/best-credit-cards-malaysia/best-no-annual-fee-credit-cards-malaysia/",
  },
  {
    id: "ambank-cash-rebate-platinum",
    bank: "AmBank",
    name: "Cash Rebate Visa Platinum",
    annualFee: 0,
    feeWaiverNote: "终身免年费",
    feeWaiverEasy: true,
    minMonthlyIncome: 2000,
    focus: ["grocery_daily", "online_shopping", "dining"],
    priorityFit: ["max_cashback", "no_annual_fee"],
    headline: "网购 / 超市 / 餐饮最高约10%回扣",
    pros: [
      "网购、超市、餐饮、交通等指定类别最高约10%现金回扣",
      "终身免年费，门槛低（月入RM2,000起）",
    ],
    cons: [
      "回扣有月度上限（约RM10），大额消费者可能很快用完额度",
      "每年需缴RM25印花税/SST（马来西亚大部分信用卡皆有此收费，非本卡独有）",
    ],
    sourceUrl: "https://ringgitplus.com/en/credit-card/cashback/",
    cashbackRate: 0.1,
    monthlyCashbackCap: 10,
  },
  {
    id: "uob-one",
    bank: "UOB",
    name: "ONE Card",
    annualFee: 195,
    feeWaiverNote: "首年免年费，之后每年消费达RM20,000可豁免（2026年起新规）",
    feeWaiverEasy: false,
    minMonthlyIncome: 3000,
    focus: ["grocery_daily", "petrol", "dining"],
    priorityFit: ["max_cashback"],
    headline: "超市 / 油站 / 餐饮 / Grab 最高10%回扣",
    pros: [
      "超市、油站、餐饮、Grab等类别最高10%回扣",
      "覆盖的日常类别较全面，不用另外办油站卡/网购卡",
    ],
    cons: [
      "2026年起年费豁免门槛提高至年消费RM20,000（约每月RM1,667），消费量不够可能要付RM195年费",
      "各类别回扣上限较低（每类别约RM15/月）",
    ],
    sourceUrl: "https://www.uob.com.my/personal/useful/fees/creditcard-annualfee.page",
    feeWaiverAnnualSpend: 20000,
    cashbackRate: 0.1,
    monthlyCashbackCap: 15,
  },
  {
    id: "cimb-cash-rebate-platinum",
    bank: "CIMB",
    name: "Cash Rebate Platinum",
    annualFee: 0,
    feeWaiverNote: "终身免年费",
    feeWaiverEasy: true,
    minMonthlyIncome: 2000,
    focus: ["petrol", "grocery_daily"],
    priorityFit: ["max_cashback", "no_annual_fee"],
    headline: "油站 / 超市 / 水电费最高5%回扣",
    pros: ["油站、超市、水电费最高5%现金回扣", "终身免年费，门槛低（月入RM2,000起）"],
    cons: [
      "回扣月度上限较低（约RM30），大额消费者获益有限",
      "回扣类别相对集中在油站/超市/水电费，覆盖面不如综合型现金回扣卡",
    ],
    sourceUrl: "https://www.cimb.com.my/en/personal/day-to-day-banking/cards/credit-card/cimb-cash-rebate-platinum-credit-card.html",
    cashbackRate: 0.05,
    monthlyCashbackCap: 30,
  },
  {
    id: "rhb-cash-back-visa",
    bank: "RHB",
    name: "Cash Back Visa",
    annualFee: 70,
    feeWaiverNote: "首年免年费，之后每年消费满RM10,000可豁免",
    feeWaiverEasy: true,
    minMonthlyIncome: 2000,
    focus: ["mixed", "online_shopping"],
    priorityFit: ["max_cashback", "no_annual_fee"],
    headline: "多类别最高10%现金回扣",
    pros: ["多个日常消费类别最高10%现金回扣", "适合消费分散、不想只锁定单一类别的人"],
    cons: [
      "次年起有RM70年费，需每年消费满RM10,000（约每月RM833）才能豁免",
      "各回扣类别的具体上限需以官网T&C为准，条款较细",
    ],
    sourceUrl: "https://www.rhbgroup.com/personal/cards/credit-cards/rhb-cash-back-credit-card/index.html",
    feeWaiverAnnualSpend: 10000,
  },
  {
    id: "rhb-shell-visa",
    bank: "RHB",
    name: "Shell Visa",
    annualFee: 195,
    feeWaiverNote: "首年免年费，之后每年刷卡满24次可豁免",
    feeWaiverEasy: true,
    minMonthlyIncome: 2000,
    focus: ["petrol"],
    priorityFit: ["max_cashback"],
    headline: "全马数一数二的油站回扣卡",
    pros: [
      "Shell油站消费最高12%现金回扣",
      "超市、网购、水电网费等日常消费另有约5%回扣",
    ],
    cons: [
      "12%最高回扣只限Shell油站，其他油站不适用",
      "次年年费RM195，需每年刷卡满24次才能豁免",
    ],
    sourceUrl: "https://www.rhbgroup.com/personal/cards/credit-cards/rhb-shell-visa-credit-card/index.html",
    cashbackRate: 0.12,
    monthlyCashbackCap: 30,
  },
  {
    id: "cimb-petronas-platinum-i",
    bank: "CIMB",
    name: "PETRONAS Visa Platinum-i",
    annualFee: 0,
    feeWaiverNote: "终身免年费",
    feeWaiverEasy: true,
    minMonthlyIncome: 2000,
    focus: ["petrol"],
    priorityFit: ["max_cashback", "no_annual_fee"],
    headline: "PETRONAS油站最高8%回扣",
    pros: ["PETRONAS油站消费最高8%现金回扣", "终身免年费，门槛低（月入RM2,000起）"],
    cons: [
      "8%回扣只限PETRONAS/Setel消费，其他油站不适用",
      "属伊斯兰卡（Shariah-compliant），收费结构与传统信用卡略有不同，需留意T&C",
    ],
    sourceUrl: "https://www.cimb.com.my/en/personal/day-to-day-banking/cards/credit-card/cimb-petronas-visa-platinum-i-credit-card.html",
  },
  {
    id: "public-bank-visa-signature",
    bank: "Public Bank",
    name: "Visa Signature",
    annualFee: 388,
    feeWaiverNote: "首年免年费，之后每年刷卡满12次可豁免",
    feeWaiverEasy: true,
    minMonthlyIncome: 6667,
    focus: ["online_shopping"],
    priorityFit: ["max_cashback"],
    headline: "网购3%回扣，适合网购金额较大的人",
    pros: [
      "网购消费3%现金回扣",
      "首年免年费，之后每年只需刷卡满12次即可继续豁免（门槛不算高）",
    ],
    cons: [
      "网购回扣率相对较低（3%），比不上部分网购专用卡（如AmBank最高约10%）",
      "收入门槛较高（月入需RM6,667以上），入门用户可能不符合资格",
    ],
    sourceUrl: "https://www.pbebank.com/en/cards/our-cards/pb-visa-signature-credit-card/",
  },
  {
    id: "hsbc-travelone",
    bank: "HSBC",
    name: "TravelOne Credit Card",
    annualFee: 300,
    feeWaiverNote: "首年免年费，之后每年消费满RM20,000可豁免（相对其他里程卡门槛较易达到）",
    feeWaiverEasy: false,
    feeWaiverAnnualSpend: 20000,
    minMonthlyIncome: 8500,
    focus: ["travel"],
    priorityFit: ["travel_miles"],
    headline: "RinggitPlus 主推里程卡：海外消费高积分 + 年费门槛较易达到",
    pros: [
      "海外/外币消费最高8倍积分，积分可转换里程",
      "附带机场贵宾室使用权益",
      "年费豁免门槛（年消费RM20,000）比其他里程卡低很多，更容易达到",
    ],
    cons: [
      "本地（非外币）消费积分倍数低很多，主要海外刷卡才划算",
      "收入门槛仍偏高（月入需RM8,500以上）",
    ],
    sourceUrl: "https://www.hsbc.com.my/credit-cards/products/travelone/rewards/",
  },
  {
    id: "sc-journey",
    bank: "Standard Chartered",
    name: "Journey Credit Card",
    annualFee: 600,
    feeWaiverNote: "首年免年费，之后每年消费满RM60,000才可豁免（门槛很高）",
    feeWaiverEasy: false,
    minMonthlyIncome: 8000,
    focus: ["travel"],
    priorityFit: ["travel_miles"],
    headline: "入门级里程卡，含机场贵宾室",
    pros: [
      "指定类别消费可累积航空里程",
      "附带机场贵宾室使用权益",
    ],
    cons: [
      "年费RM600，次年起需消费满RM60,000/年（约每月RM5,000）才能豁免，对多数人门槛偏高",
      "里程累积速度不算业界最高，适合已确定常旅行、消费量大的人",
    ],
    sourceUrl: "https://www.sc.com/my/credit-cards/journey/",
  },
  {
    id: "uob-prvi-miles-elite",
    bank: "UOB",
    name: "PRVI Miles Elite",
    annualFee: 600,
    feeWaiverNote: "首年免年费，2026年起每年消费满RM50,000才可豁免（门槛较高）",
    feeWaiverEasy: false,
    minMonthlyIncome: 8333,
    focus: ["travel"],
    priorityFit: ["travel_miles"],
    headline: "海外消费里程加成 + 机场贵宾室",
    pros: [
      "本地消费最高12倍积分，海外消费最高2倍里程",
      "机场贵宾室使用权益",
    ],
    cons: [
      "2026年起年费豁免门槛提高至年消费RM50,000，消费量不够很难免年费",
      "本地消费里程累积率不如海外消费，主要海外常旅客才划算",
    ],
    sourceUrl: "https://www.uob.com.my/personal/cards/credit-cards/uob-prvi-miles-elite-card.page",
  },
  {
    id: "maybank-world-elite",
    bank: "Maybank",
    name: "World Mastercard",
    annualFee: 800,
    feeWaiverNote: "首年免年费，之后每年消费满RM120,000才可豁免（门槛非常高）",
    feeWaiverEasy: false,
    minMonthlyIncome: 10000,
    focus: ["travel"],
    priorityFit: ["travel_miles"],
    headline: "高端里程卡，可转换多个航空里程计划",
    pros: [
      "积分可转换 Enrich / KrisFlyer / Asia Miles 等里程计划",
      "机场贵宾室及多项旅行保障权益",
    ],
    cons: [
      "收入门槛高（月入需RM10,000以上）",
      "年费RM800，豁免门槛为年消费RM120,000（等同收入门槛），对大部分人来说等于固定成本",
    ],
    sourceUrl: "https://www.comparehero.my/credit-card/product/maybank-world-elite-mastercard/",
  },
];

export interface CreditCardAnswers {
  monthlyIncome: number;
  // 每月总支出（RM），用来跟年费豁免所需的年度刷卡消费门槛比较。
  monthlyExpense: number;
  focus: SpendingFocus[];
  // 在选中的消费类别上，每月大概花多少（RM），用来估算现金回扣卡实际能拿回多少钱。
  categorySpend: number;
  priority: Priority[];
  feeTolerant: boolean;
}

export interface CreditCardEstimate {
  annualSpend: number;
  feeWaiverReachable: boolean | null; // null = 这张卡没有明确的消费门槛可比较
  estimatedMonthlyCashback: number | null; // null = 没有足够把握的回扣率/上限数据
  cashbackCapped: boolean;
}

export interface CreditCardMatch {
  card: CreditCardOption;
  score: number;
  reasons: string[];
  eligible: boolean;
  estimate: CreditCardEstimate;
}

function estimateForCard(card: CreditCardOption, answers: CreditCardAnswers): CreditCardEstimate {
  const annualSpend = answers.monthlyExpense * 12;

  const feeWaiverReachable =
    card.feeWaiverAnnualSpend != null ? annualSpend >= card.feeWaiverAnnualSpend : null;

  let estimatedMonthlyCashback: number | null = null;
  let cashbackCapped = false;
  if (card.cashbackRate != null && card.monthlyCashbackCap != null) {
    const raw = answers.categorySpend * card.cashbackRate;
    estimatedMonthlyCashback = Math.min(raw, card.monthlyCashbackCap);
    cashbackCapped = raw > card.monthlyCashbackCap;
  }

  return { annualSpend, feeWaiverReachable, estimatedMonthlyCashback, cashbackCapped };
}

function scoreCard(card: CreditCardOption, answers: CreditCardAnswers, estimate: CreditCardEstimate) {
  let score = 0;
  const reasons: string[] = [];

  const wantsFlexibility =
    answers.focus.includes("mixed") || answers.priority.includes("simple_low_effort");

  const matchedFocus = answers.focus.filter((f) => card.focus.includes(f));
  if (matchedFocus.length > 0) {
    score += 40 + (matchedFocus.length - 1) * 15;
    reasons.push(
      `覆盖你选的「${matchedFocus.map((f) => SPENDING_FOCUS_LABELS[f]).join("、")}」消费类别`,
    );
  } else if (wantsFlexibility && (card.focus.includes("mixed") || card.focus.length >= 2)) {
    // 只有当用户自己选了「不特别集中」或「越简单越好」，才把「覆盖面广」当加分项——
    // 不然像专攻旅行/单一类别的用户，会一直被这种泛用卡挤掉真正对口的卡。
    score += 10;
    reasons.push("覆盖多个日常消费类别，弹性较高");
  }

  const matchedPriority = answers.priority.filter((p) => card.priorityFit.includes(p));
  if (matchedPriority.length > 0) {
    score += 35 + (matchedPriority.length - 1) * 10;
    reasons.push(
      `符合你看重的「${matchedPriority.map((p) => PRIORITY_LABELS[p]).join("、")}」`,
    );
  }

  // 这张卡跟用户选的消费类别、看重的点完全不沾边——不该只因为免年费或回扣估算
  // 就跑到推荐榜前面，明显压低排名，除非真的没有更对口的卡可选。
  if (matchedFocus.length === 0 && matchedPriority.length === 0 && !wantsFlexibility) {
    score -= 30;
  }

  if (estimate.estimatedMonthlyCashback != null && estimate.estimatedMonthlyCashback > 0) {
    score += Math.min(estimate.estimatedMonthlyCashback, 50);
    reasons.push(
      estimate.cashbackCapped
        ? `以你填的类别月支出估算，这张卡每月大约能拿回 RM${estimate.estimatedMonthlyCashback.toFixed(0)}（已达每月上限，超出部分没有额外回扣）`
        : `以你填的类别月支出估算，这张卡每月大约能拿回 RM${estimate.estimatedMonthlyCashback.toFixed(0)}`,
    );
  }

  if (card.annualFee === 0) {
    if (!answers.feeTolerant) score += 15;
  } else if (estimate.feeWaiverReachable === true) {
    score += answers.feeTolerant ? 5 : 12;
    reasons.push(
      `以你的月支出估算年消费约 RM${estimate.annualSpend.toLocaleString()}，够得上这张卡 RM${card.feeWaiverAnnualSpend!.toLocaleString()} 的免年费门槛`,
    );
  } else if (estimate.feeWaiverReachable === false) {
    score -= answers.feeTolerant ? 15 : 45;
    reasons.push(
      `以你的月支出估算年消费约 RM${estimate.annualSpend.toLocaleString()}，达不到这张卡 RM${card.feeWaiverAnnualSpend!.toLocaleString()} 的免年费门槛，很可能每年要付 RM${card.annualFee} 年费`,
    );
  } else if (!answers.feeTolerant) {
    if (card.feeWaiverEasy) {
      score += 5;
    } else {
      score -= 40;
    }
  } else {
    score += 5;
  }

  return { score, reasons };
}

export function matchCreditCards(answers: CreditCardAnswers): CreditCardMatch[] {
  const eligibleCards = CREDIT_CARDS.filter(
    (c) => c.minMonthlyIncome <= answers.monthlyIncome,
  );

  const pool = eligibleCards.length > 0 ? eligibleCards : CREDIT_CARDS;

  const matches: CreditCardMatch[] = pool.map((card) => {
    const estimate = estimateForCard(card, answers);
    const { score, reasons } = scoreCard(card, answers, estimate);
    return { card, score, reasons, eligible: eligibleCards.length > 0, estimate };
  });

  matches.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.card.annualFee !== b.card.annualFee) return a.card.annualFee - b.card.annualFee;
    return a.card.minMonthlyIncome - b.card.minMonthlyIncome;
  });

  return matches.slice(0, 4);
}
