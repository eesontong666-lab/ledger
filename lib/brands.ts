// 内置的常见商家名单（以马来西亚为主）。认出来之后：
//   1) 把银行那种乱七八糟的商户名（"MCDONALDS-SS15 DT 1010349"）换成干净的品牌名
//   2) 直接知道它属于哪个分类
// 分类只有 衣 / 食 / 住 / 行 / 其他支出。名单里没有的商家，靠用户改一次分类后记住（merchant_rules）。
// 比对前会先去掉撇号、把各种符号变成空格，所以 "McDonald's"、"MC DONALDS"、"MCDONALDS-SS15" 都一样。

// name 是 null 的：只用来判断分类，商家名字保留截图上原本的（例如某个停车场的名字）
// 第四栏写 true 的：这家店什么都卖（超市、百货、网购），每次买的东西不一样，
// 所以每次都问用户这笔算哪一类，也不会“记住”上次的选择。
type Brand = [pattern: RegExp, name: string | null, category: string, askEveryTime?: true];

export const BRANDS: Brand[] = [
  // ---------- 食：快餐 / 连锁餐厅 ----------
  [/mc ?donald|\bmcd\b|\bmekdi\b/, "McDonald's", "食"],
  [/\bkfc\b|kentucky fried/, "KFC", "食"],
  [/burger king/, "Burger King", "食"],
  [/\bsubway\b/, "Subway", "食"],
  [/pizza hut/, "Pizza Hut", "食"],
  [/domino/, "Domino's", "食"],
  [/marrybrown/, "Marrybrown", "食"],
  [/texas chicken/, "Texas Chicken", "食"],
  [/\ba ?& ?w\b|a and w restaurant/, "A&W", "食"],
  [/nando/, "Nando's", "食"],
  [/4 ?fingers/, "4Fingers", "食"],
  [/kyochon/, "Kyochon", "食"],
  [/my ?burger ?lab/, "myBurgerLab", "食"],
  [/secret recipe/, "Secret Recipe", "食"],
  [/old ?town (white )?coffee|oldtown/, "OldTown White Coffee", "食"],
  [/papparich|pappa rich/, "PappaRich", "食"],
  [/oriental kopi/, "Oriental Kopi", "食"],
  [/kenny rogers/, "Kenny Rogers Roasters", "食"],
  [/chicken rice shop/, "The Chicken Rice Shop", "食"],
  [/sushi king/, "Sushi King", "食"],
  [/sushi zanmai/, "Sushi Zanmai", "食"],
  [/sushi mentai/, "Sushi Mentai", "食"],
  [/sukiya/, "Sukiya", "食"],
  [/hai ?di ?lao/, "Haidilao", "食"],
  [/din tai fung/, "Din Tai Fung", "食"],
  [/dragon i\b/, "Dragon-i", "食"],
  [/absolute thai/, "Absolute Thai", "食"],
  [/\bbbq plaza\b|bar b q plaza/, "Bar.B.Q Plaza", "食"],
  // ---------- 食：咖啡 / 茶饮 / 甜点 ----------
  [/starbucks/, "Starbucks", "食"],
  [/coffee bean/, "The Coffee Bean", "食"],
  [/\bzus\b/, "ZUS Coffee", "食"],
  [/gigi coffee/, "Gigi Coffee", "食"],
  [/luckin/, "Luckin Coffee", "食"],
  [/bask bear/, "Bask Bear Coffee", "食"],
  [/kopi kenangan|kenangan coffee/, "Kenangan Coffee", "食"],
  [/tealive/, "Tealive", "食"],
  [/chagee/, "Chagee", "食"],
  [/gong ?cha/, "Gong Cha", "食"],
  [/chatime/, "Chatime", "食"],
  [/\bkoi\b.*(the|cafe)|koi the/, "KOI Thé", "食"],
  [/mixue/, "Mixue", "食"],
  [/the alley/, "The Alley", "食"],
  [/baskin/, "Baskin-Robbins", "食"],
  [/llao ?llao/, "llaollao", "食"],
  [/inside scoop/, "Inside Scoop", "食"],
  [/famous amos/, "Famous Amos", "食"],
  [/dunkin/, "Dunkin'", "食"],
  [/krispy kreme/, "Krispy Kreme", "食"],
  [/big apple/, "Big Apple Donuts", "食"],
  [/auntie anne/, "Auntie Anne's", "食"],
  [/rotiboy/, "Rotiboy", "食"],
  [/lavender (bakery|confectionery)/, "Lavender Bakery", "食"],
  // ---------- 食：外卖 ----------
  [/grab ?food/, "GrabFood", "食"],
  [/food ?panda/, "foodpanda", "食"],
  [/shopee ?food/, "ShopeeFood", "食"],
  // ---------- 食：超市 / 便利店（买菜、买吃的） ----------
  [/jaya grocer/, "Jaya Grocer", "食", true],
  [/village grocer/, "Village Grocer", "食", true],
  [/ben s independent|\bbig\b.*grocer/, "B.I.G.", "食", true],
  [/lotus ?s?\b.*(store|stores|malaysia)|\blotuss\b|\btesco\b/, "Lotus's", "食", true],
  [/\baeon big\b/, "AEON BiG", "食", true],
  [/\bmydin\b/, "Mydin", "食", true],
  [/\bgiant\b/, "Giant", "食", true],
  [/econsave/, "Econsave", "食", true],
  [/\bnsk\b/, "NSK", "食", true],
  [/hero ?market/, "HeroMarket", "食", true],
  [/99 ?speed ?mart/, "99 Speedmart", "食", true],
  [/kk ?(super ?)?mart/, "KK Super Mart", "食", true],
  [/7 ?eleven|\b7 ?11\b|7 e malaysia/, "7-Eleven", "食", true],
  [/family ?mart/, "FamilyMart", "食", true],
  [/my ?news/, "myNEWS", "食", true],
  [/emart ?24/, "emart24", "食", true],
  // ---------- 行：油站 ----------
  [/petronas|\bmesra\b/, "Petronas", "行"],
  [/\bsetel\b/, "Setel", "行"],
  [/\bshell\b/, "Shell", "行"],
  [/\bpetron\b/, "Petron", "行"],
  [/caltex/, "Caltex", "行"],
  [/bh ?petrol|\bbhp\b/, "BHPetrol", "行"],
  [/\bbp\b.*(station|petrol|connect)|^bp\b/, "BP", "行"],
  // ---------- 行：过路费 / 停车 / 公共交通 ----------
  [/touch ?n ?go|\btng\b/, "Touch 'n Go", "行", true],
  [/\bplus\b.*(toll|highway|miles)|plus malaysia/, "PLUS Highway", "行"],
  [/rapid ?kl|rapid ?bus|rapid ?rail|prasarana|\bmrt\b|\blrt\b|monorail/, "Rapid KL", "行"],
  [/\bktm\b|keretapi tanah melayu|\bets\b ticket/, "KTM", "行"],
  [/\bjpark\b|flexi ?parking|smart selangor parking|\bparking\b|\bparkir\b/, null, "行"],
  [/easybook|red ?bus|bus ?online ?ticket/, null, "行"],
  // ---------- 行：叫车 / 租车 / 充电 ----------
  [/\bgrab\b/, "Grab", "行", true],
  [/air ?asia ?ride|airasia move/, "AirAsia Ride", "行"],
  [/\bbolt\b/, "Bolt", "行"],
  [/\bmaxim\b/, "Maxim", "行"],
  [/in ?driver|\bindrive\b/, "inDrive", "行"],
  [/\bsocar\b/, "SOCAR", "行"],
  [/go ?car\b/, "GoCar", "行"],
  [/charg ?ev|gentari|jom ?charge/, null, "行"],
  // ---------- 行：机票 ----------
  [/air ?asia/, "AirAsia", "行"],
  [/malaysia airlines|\bmas\b airlines/, "Malaysia Airlines", "行"],
  [/batik air|malindo/, "Batik Air", "行"],
  [/firefly/, "Firefly", "行"],
  [/\bscoot\b/, "Scoot", "行"],
  // ---------- 行：车子保养 ----------
  [/\bjpj\b|puspakom|road ?tax|my ?eg/, null, "行"],
  [/tayar|\btyre\b|bengkel|car ?wash|auto ?service|perodua service|proton service/, null, "行"],
  // ---------- 住：水电 / 网络 / 电话 ----------
  [/\btnb\b|tenaga nasional|my ?tnb/, null, "住"],
  [/air selangor|syabas|\bpba\b|ranhill|\bsaj\b|pengurusan air/, null, "住"],
  [/indah water|\biwk\b/, "Indah Water", "住"],
  [/\bunifi\b|telekom malaysia|\btm\b net/, "unifi", "住"],
  [/time ?dotcom|time ?fibre|time internet/, "TIME", "住"],
  [/celcom ?digi|\bcelcom\b|\bdigi\b/, "CelcomDigi", "住"],
  [/\bmaxis\b|\bhotlink\b/, "Maxis", "住"],
  [/u ?mobile/, "U Mobile", "住"],
  [/\byes 4g\b|\byes 5g\b|\bytl comm/, "Yes", "住"],
  [/\bastro\b/, "Astro", "住"],
  [/\bgas malaysia\b|\bgas petronas\b|\bmira gas\b/, null, "住"],
  // ---------- 住：房租 / 家具 / 家用 ----------
  [/\bsewa\b|\brental\b|\brent\b|maintenance fee|management fee|\bjmb\b|\bmc\b fee/, null, "住"],
  [/\bikea\b/, "IKEA", "住"],
  [/mr ?d ?i ?y\b/, "MR.DIY", "住", true],
  [/ace hardware/, "Ace Hardware", "住"],
  [/home ?pro\b/, "HomePro", "住"],
  [/\bssf\b|kaison|\bnitori\b/, null, "住"],
  [/\bdobi\b|laundry|launderette/, null, "住"],
  // ---------- 衣：服饰 ----------
  [/uniqlo/, "Uniqlo", "衣"],
  [/\bh ?& ?m\b|hennes/, "H&M", "衣"],
  [/\bzara\b/, "Zara", "衣"],
  [/padini|brands outlet|\bp ?& ?co\b/, "Padini", "衣"],
  [/cotton on/, "Cotton On", "衣"],
  [/\bnike\b/, "Nike", "衣"],
  [/adidas/, "Adidas", "衣"],
  [/\bpuma\b/, "Puma", "衣"],
  [/skechers/, "Skechers", "衣"],
  [/\bbata\b/, "Bata", "衣"],
  [/vincci/, "Vincci", "衣"],
  [/charles ?& ?keith|charles and keith/, "Charles & Keith", "衣"],
  [/\bmuji\b/, "MUJI", "衣"],
  [/decathlon/, "Decathlon", "衣"],
  // ---------- 衣：网购 / 百货（一般购物） ----------
  [/shopee/, "Shopee", "衣", true],
  [/lazada/, "Lazada", "衣", true],
  [/tiktok ?shop/, "TikTok Shop", "衣", true],
  [/zalora/, "Zalora", "衣"],
  [/taobao|tmall/, "Taobao", "衣", true],
  [/\bshein\b/, "Shein", "衣"],
  [/\btemu\b/, "Temu", "衣", true],
  [/\baeon\b/, "AEON", "衣", true],
  [/parkson/, "Parkson", "衣", true],
  [/\bsogo\b/, "SOGO", "衣", true],
  [/\bisetan\b/, "Isetan", "衣", true],
  [/daiso/, "Daiso", "衣", true],
  [/watsons/, "Watsons", "衣", true],
  [/guardian/, "Guardian", "衣", true],
  [/sephora/, "Sephora", "衣"],
];

// 没有品牌名、但名字里的字眼已经说明了是什么店
const GENERIC: [RegExp, string][] = [
  [/restoran|restaurant|kedai makan|kopitiam|kopi\b|cafe|bakery|kitchen|bistro|\bfood\b|nasi|mee\b|mamak|warung|dim sum|steamboat|bbq|burger|pizza|sushi|ramen|noodle|chicken rice|bak kut teh|pancake|dessert|茶|饭|面|餐|食/, "食"],
  [/petrol|\bfuel\b|\btoll\b|\btol\b|taxi|teksi|\bbus\b|airport|airline|car rental/, "行"],
  [/hardware|furniture|perabot|electric(al)? bill|water bill|internet|broadband|电费|水费|房租/, "住"],
  [/fashion|boutique|butik|apparel|clothing|shoes|kasut|\bmall\b|departmental|服饰|商场/, "衣"],
];

function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/['’`]/g, "")
    .replace(/[^\p{L}\p{N}&]+/gu, " ")
    .trim();
}

export type Identified = {
  /** 干净的品牌名；null = 保留截图上原本的名字 */
  name: string | null;
  category: string;
  /** 这家店什么都卖，分类要问用户 */
  askEveryTime: boolean;
};

/** 认出商家：返回干净的名字和分类；认不出返回 null。 */
export function identifyMerchant(merchant: string | null): Identified | null {
  if (!merchant) return null;
  const text = normalize(merchant);
  if (!text) return null;
  for (const [pattern, name, category, askEveryTime] of BRANDS) {
    if (pattern.test(text)) return { name, category, askEveryTime: askEveryTime === true };
  }
  for (const [pattern, category] of GENERIC) {
    if (pattern.test(text)) return { name: null, category, askEveryTime: false };
  }
  return null;
}
