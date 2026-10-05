import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "财务规划师",
    short_name: "财务规划师",
    description: "手机记账：截图自动记账、密码锁",
    start_url: "/home",
    display: "standalone",
    background_color: "#11131a",
    theme_color: "#11131a",
    icons: [{ src: "/apple-icon", sizes: "180x180", type: "image/png" }],
  };
}
