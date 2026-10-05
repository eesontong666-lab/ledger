"use client";

/** 页面底部的红色删除按钮，按下会先问一次确认 */
export function DeleteButton({ action, label, confirmText }: { action: () => void; label: string; confirmText: string }) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(confirmText)) e.preventDefault();
      }}
      className="mt-8"
    >
      <button
        type="submit"
        className="w-full rounded-full border border-rose-500/30 bg-rose-500/10 py-3.5 text-[15px] font-semibold text-rose-400 active:bg-rose-500/20"
      >
        🗑 {label}
      </button>
    </form>
  );
}
