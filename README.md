# Ledger · 手机记账

A phone-only bookkeeping app for iPhone: double-tap the back of the phone on a payment screen and the expense is logged automatically. Your own copy, your own data, free to run.

手机专用的记账 App：在付款成功的画面轻点 iPhone 背面两下，就自动记一笔。每个人有自己独立的一套，资料只属于自己，免费。

- 🔒 只用一个 6 位密码进入 / one 6-digit passcode, no email login
- 📸 截图自动记账（金额、商家、分类）/ screenshot logging via an iPhone Shortcut
- 🧠 认得常见商家（McDonald's、Petronas、Grab…），认不出时弹出选单问你，选过一次就记住 / recognises common merchants, asks when unsure, remembers your answer
- 💱 外币（USD、USDT、SGD…）自动按当天汇率换成马币 / foreign currencies converted to RM
- 👕🍜🏠🚗 分类：衣、食、住、行、其他
- 🏦 银行账户、投资、负债，各自的进出记录
- 🔀 收入按比例自动分进各账户 / income split across accounts
- 🎯 储蓄目标可以绑定账户，实时看进度

---

## 安装（大约 10 分钟，只做一次）· Install (about 10 minutes, once)

你需要两个免费账号 / You need two free accounts:

1. **GitHub** — <https://github.com/signup>
2. **Vercel** — <https://vercel.com/signup> → 选 **Continue with GitHub**，方案选 **Hobby**（免费）

然后点这个按钮 / Then click this button:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Feesontong666-lab%2Fledger&project-name=my-ledger&repository-name=my-ledger&stores=%5B%7B%22type%22%3A%22integration%22%2C%22integrationSlug%22%3A%22supabase%22%2C%22productSlug%22%3A%22supabase%22%2C%22protocol%22%3A%22storage%22%7D%5D)

在打开的页面里照顺序做 / On the page that opens:

1. **Create Git Repository** — 直接点 **Create**。
2. **Add Supabase**（数据库 / the database）— 点 **Add**，接受条款，Region 选 **Singapore (Southeast Asia)**，Plan 选 **Free**，点 **Create**。
3. 点 **Deploy**，等大约 2 分钟 / wait about 2 minutes.
4. 出现恭喜画面后，点预览图打开你的网站。这个网址就是你的 App，把它记下来。
   When the congratulations screen appears, click the preview to open your site. That address is your app — keep it.

数据库的表会在部署时自动建好，不用做任何设定。
The database tables are created automatically during deployment.

## 第一次使用 · First use (on your iPhone)

1. 用 **Safari** 打开你的网址 / Open your address in **Safari**.
2. 设一个 **6 位密码**（输入两次）/ Set a **6-digit passcode** (enter it twice).
   第一个设密码的人就是这个账本的主人，所以部署好后马上设。
   Whoever sets it first owns the ledger, so do this right after deploying.
3. 点 **分享 → 添加到主屏幕** / Tap **Share → Add to Home Screen**.
4. 进 **账户**，加上你的银行账户和余额 / Go to **Accounts** and add your bank accounts.
5. 进 **设置 → 截图记账**，照页面上的 3 步做（右上角可以切换 中 / EN）：
   Go to **Settings → Screenshot Logging** and follow the 3 steps (switch 中 / EN at the top right):
   生成专属链接 → 下载快捷指令 → 设置「轻点背面两下」
   generate your personal link → download the shortcut → turn on Back Tap › Double Tap

## 要知道的事 · Good to know

- **忘记密码 / Forgot the passcode**：到 Supabase → Table Editor → `app_passcode`，把 `passcode_hash` 清空（设成 NULL），再打开 App 就会让你重新设置。
  In Supabase → Table Editor → `app_passcode`, set `passcode_hash` to NULL; the app will ask for a new one.
- **太久没用会暂停 / Pauses when idle**：Supabase 免费版大约一星期没人用就会暂停。登录 <https://supabase.com/dashboard> 点 **Restore** 即可，资料不会丢。
  The free Supabase plan pauses after about a week without use. Open the dashboard and click **Restore**; nothing is lost.
- **截图识别 / Screenshot reading**：按马来西亚的 RM 付款画面调校（Ryt Bank 的交易详情最准）。别的银行可能读不准，可以在交易里手动改分类。
  Tuned for Malaysian RM payment screens (Ryt Bank works best). Other banks may be less accurate; you can fix the category on any entry.
- **更新 / Updates**：你的这一套是独立的副本，原作者之后加的新功能不会自动出现。
  Your copy is independent; later changes by the original author do not appear automatically.
- 这是个人工具，不提供任何理财或投资建议。/ A personal tool; it gives no financial or investment advice.

## 开发 · Development

Next.js + Supabase。数据库结构在 `supabase/setup.sql`（可重复执行）。本机运行：

```bash
npm install
npm run dev
```

需要 `.env.local`：`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`、`SUPABASE_SERVICE_ROLE_KEY`。
