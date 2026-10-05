import { handleCapture } from "@/lib/capture";

// 新版快捷指令：密钥就在网址里，整条网址是用户的“专属链接”
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return handleCapture(request, token);
}
