import { handleSetAccount } from "@/lib/capture";

// 快捷指令弹出“用哪个账户付的？”之后，把用户选的账户送到这里
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return handleSetAccount(request, token);
}
