"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "zh" | "en";
const KEY = "fp-lang";

const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({
  lang: "zh",
  setLang: () => {},
});

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("zh");

  useEffect(() => {
    // 记住上次的选择；没选过就跟手机系统语言走
    queueMicrotask(() => {
      let saved: string | null = null;
      try {
        saved = localStorage.getItem(KEY);
      } catch {}
      if (saved === "zh" || saved === "en") setLangState(saved);
      else setLangState(navigator.language.toLowerCase().startsWith("zh") ? "zh" : "en");
    });
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(KEY, l);
    } catch {}
  };

  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}

/** 按当前语言显示其中一份内容 */
export function T({ zh, en }: { zh: ReactNode; en: ReactNode }) {
  const { lang } = useLang();
  return <>{lang === "en" ? en : zh}</>;
}

export function LangToggle() {
  const { lang, setLang } = useLang();
  return (
    <div className="flex rounded-full border border-white/10 bg-[#1c1f28] p-0.5 text-xs font-semibold">
      {(["zh", "en"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={`rounded-full px-2.5 py-1.5 transition ${lang === l ? "bg-[#d9748a] text-white" : "text-white/50"}`}
        >
          {l === "zh" ? "中" : "EN"}
        </button>
      ))}
    </div>
  );
}
