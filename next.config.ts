import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // 快捷指令文件一律当作“下载”，不要让浏览器试着直接打开显示
        source: "/:file(.*\\.shortcut)",
        headers: [{ key: "Content-Disposition", value: "attachment" }],
      },
    ];
  },
};

export default nextConfig;
