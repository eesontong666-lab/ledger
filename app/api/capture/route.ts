import { handleCapture } from "@/lib/capture";

// 旧版快捷指令：密钥放在 Authorization 头里
export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  return handleCapture(request, token);
}
