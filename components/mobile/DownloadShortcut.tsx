"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * 下载快捷指令的按钮。
 * 从主屏幕打开的 App（standalone）里如果直接打开文件，整个 App 的画面会被文件占掉，而且没有返回键。
 * 所以在 standalone 里改用 x-safari-https:// 把下载交给 Safari，App 留在原来这一页；
 * 在普通的 Safari 里就照常下载。
 */
export function DownloadShortcut({
  fileUrl,
  fileName,
  className,
  children,
}: {
  fileUrl: string;
  fileName: string;
  className?: string;
  children: ReactNode;
}) {
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    queueMicrotask(() =>
      setStandalone(
        (navigator as Navigator & { standalone?: boolean }).standalone === true ||
          window.matchMedia("(display-mode: standalone)").matches,
      ),
    );
  }, []);

  if (standalone && fileUrl.startsWith("https://")) {
    return (
      <a href={`x-safari-${fileUrl}`} className={className}>
        {children}
      </a>
    );
  }
  return (
    <a href={fileUrl} download={fileName} className={className}>
      {children}
    </a>
  );
}
