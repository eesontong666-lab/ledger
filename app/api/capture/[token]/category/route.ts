import { handleSetCategory } from "@/lib/capture";

// 快捷指令弹出“这笔算哪一类？”之后，把用户选的分类送到这里
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return handleSetCategory(request, token);
}
