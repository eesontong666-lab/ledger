"use client";

import { useState, type ReactNode } from "react";
import { Panel } from "@/components/mobile/ui";
import { useLang, type Lang } from "@/components/mobile/lang";

type Step = { icon: string; title: string; body: ReactNode };

const list = "list-decimal space-y-1.5 pl-5";

// 英文版用的是 iPhone 英文系统里的原名，中文版用中文系统的叫法。
function steps(lang: Lang): Step[] {
  if (lang === "en") {
    return [
      {
        icon: "🧩",
        title: "Create a new shortcut",
        body: (
          <ol className={list}>
            <li>
              Open the <b>Shortcuts</b> app (built into iPhone).
            </li>
            <li>
              Tap <b>＋</b> at the top right.
            </li>
            <li>
              Tap the name at the top → <b>Rename</b> → type <b>Ledger Screenshot</b>.
            </li>
          </ol>
        ),
      },
      {
        icon: "📸",
        title: "Add “Take Screenshot”",
        body: (
          <ol className={list}>
            <li>
              Tap <b>Search Actions</b> at the bottom.
            </li>
            <li>
              Type <b>screenshot</b> and tap <b>Take Screenshot</b>.
            </li>
          </ol>
        ),
      },
      {
        icon: "🔤",
        title: "Add “Extract Text from Image”",
        body: (
          <ol className={list}>
            <li>
              Search <b>extract text</b> and tap <b>Extract Text from Image</b>.
            </li>
            <li>
              It should read “Extract text from <b>Screenshot</b>”. If not, tap the blue word and choose <b>Screenshot</b>.
            </li>
          </ol>
        ),
      },
      {
        icon: "🌐",
        title: "Add “Get Contents of URL”",
        body: (
          <ol className={list}>
            <li>
              Search <b>get contents</b> and tap <b>Get Contents of URL</b>.
            </li>
            <li>
              Tap the URL box, delete whatever is in it, and paste the <b>personal link</b> you copied in ①.
            </li>
            <li>
              Tap the small arrow <b>›</b> on the action to show more options.
            </li>
            <li>
              <b>Method</b>: change GET to <b>POST</b>.
            </li>
            <li>
              <b>Request Body</b>: keep <b>JSON</b> → <b>Add new field</b> → <b>Text</b>. Key: <b>text</b> (lowercase). Value: tap it, then pick the variable <b>Text from Image</b> above the keyboard.
            </li>
          </ol>
        ),
      },
      {
        icon: "🔔",
        title: "Show the result",
        body: (
          <ol className={list}>
            <li>
              Search and add <b>Get Dictionary Value</b>. Make it read: Get <b>Value</b> for <b>message</b> in <b>Contents of URL</b>.
            </li>
            <li>
              Search and add <b>Show Notification</b>. Delete “Hello World” and pick the variable <b>Dictionary Value</b>.
            </li>
            <li>
              Tap <b>Done</b>. On success you will see “✅ 已记账 RM8.00 · merchant”.
            </li>
          </ol>
        ),
      },
      {
        icon: "👆",
        title: "Bind it to Back Tap",
        body: (
          <ol className={list}>
            <li>
              Open <b>Settings → Accessibility → Touch → Back Tap</b>.
            </li>
            <li>
              Tap <b>Double Tap</b>, scroll down to <b>Shortcuts</b>, choose <b>Ledger Screenshot</b>.
            </li>
            <li>Open a payment-success screen and double-tap the back of the phone. The first run asks for permission — tap <b>Allow</b>.</li>
          </ol>
        ),
      },
    ];
  }

  return [
    {
      icon: "🧩",
      title: "新建快捷指令",
      body: (
        <ol className={list}>
          <li>
            打开 iPhone 自带的「<b>快捷指令</b>」App。
          </li>
          <li>
            点右上角 <b>＋</b>。
          </li>
          <li>
            点顶部名称 → <b>重新命名</b> → 输入「<b>Ledger Screenshot</b>」。
          </li>
        </ol>
      ),
    },
    {
      icon: "📸",
      title: "添加「截屏」",
      body: (
        <ol className={list}>
          <li>
            点底部的 <b>搜索操作</b>。
          </li>
          <li>
            输入「截屏」，点 <b>截屏</b>。
          </li>
        </ol>
      ),
    },
    {
      icon: "🔤",
      title: "添加「从图像中提取文本」",
      body: (
        <ol className={list}>
          <li>
            搜索并添加 <b>从图像中提取文本</b>。
          </li>
          <li>
            应该显示「从 <b>截屏</b> 中提取文本」。不是的话，点蓝色的字改选 <b>截屏</b>。
          </li>
        </ol>
      ),
    },
    {
      icon: "🌐",
      title: "添加「获取 URL 内容」",
      body: (
        <ol className={list}>
          <li>
            搜索并添加 <b>获取 URL 内容</b>。
          </li>
          <li>
            点 URL 那一格，清空里面的东西，贴上 ① 复制的<b>专属链接</b>。
          </li>
          <li>
            点操作上的小箭头 <b>›</b> 展开更多选项。
          </li>
          <li>
            <b>方法</b>：把 GET 改成 <b>POST</b>。
          </li>
          <li>
            <b>请求体</b>保持 <b>JSON</b> → <b>添加新字段</b> → <b>文本</b>。键填 <b>text</b>（小写），值点一下后选键盘上方的变量「<b>图像中的文本</b>」。
          </li>
        </ol>
      ),
    },
    {
      icon: "🔔",
      title: "弹出结果通知",
      body: (
        <ol className={list}>
          <li>
            添加 <b>获取词典值</b>，设成：获取 <b>URL 内容</b> 中 <b>message</b> 的 <b>值</b>。
          </li>
          <li>
            添加 <b>显示通知</b>，删掉「你好，世界」，改选变量「<b>词典值</b>」。
          </li>
          <li>
            点 <b>完成</b>。记账成功会显示「✅ 已记账 RM8.00 · 商家」。
          </li>
        </ol>
      ),
    },
    {
      icon: "👆",
      title: "绑定「轻点背面」",
      body: (
        <ol className={list}>
          <li>
            打开 <b>设置 → 辅助功能 → 触控 → 轻点背面</b>。
          </li>
          <li>
            点 <b>轻点两下</b>，往下滑到「快捷指令」，选「<b>Ledger Screenshot</b>」。
          </li>
          <li>
            打开一个付款成功的画面，敲两下手机背面。第一次会问权限，点 <b>允许</b>。
          </li>
        </ol>
      ),
    },
  ];
}

export function ShortcutGuide() {
  const { lang } = useLang();
  const en = lang === "en";
  const all = steps(lang);
  const [index, setIndex] = useState(0);
  const step = all[index];
  const last = index === all.length - 1;

  return (
    <Panel className="p-5">
      <div className="flex min-h-[260px] flex-col">
        <div className="mb-4 flex h-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2a1f2a] to-[#1a1d26] text-4xl">
          {step.icon}
        </div>
        <p className="text-[12px] text-white/40">
          {en ? `Step ${index + 1} of ${all.length}` : `第 ${index + 1} 步，共 ${all.length} 步`}
        </p>
        <p className="mt-1 text-[17px] font-bold">{step.title}</p>
        <div className="mt-2 text-[14px] leading-relaxed text-white/70">{step.body}</div>
      </div>

      <div className="my-5 flex justify-center gap-1.5">
        {all.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={en ? `Step ${i + 1}` : `第 ${i + 1} 步`}
            onClick={() => setIndex(i)}
            className={`h-2 rounded-full transition-all ${i === index ? "w-6 bg-[#d9748a]" : "w-2 bg-white/20"}`}
          />
        ))}
      </div>

      <div className="grid grid-cols-[1fr_2fr] gap-3">
        <button
          type="button"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
          className="rounded-full py-3 text-[15px] font-semibold text-white/70 disabled:opacity-30"
        >
          {en ? "Back" : "返回"}
        </button>
        <button
          type="button"
          onClick={() => setIndex((i) => Math.min(all.length - 1, i + 1))}
          disabled={last}
          className="rounded-full bg-[#b35d6e] py-3 text-[15px] font-semibold text-white shadow-[0_4px_0_#6e2f3c] active:translate-y-1 disabled:opacity-40"
        >
          {last ? (en ? "Done 🎉" : "完成 🎉") : en ? "Next" : "下一个"}
        </button>
      </div>
    </Panel>
  );
}
