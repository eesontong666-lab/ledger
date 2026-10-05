import { createClient } from "@/lib/supabase/server";
import { PasscodeLogin } from "@/components/mobile/PasscodeLogin";

export default async function LoginPage() {
  const supabase = await createClient();
  const { data: state, error } = await supabase.rpc("app_passcode_state");

  // 全新安装时还没有主人，state 是 null，同样要先设置密码
  // （查询失败时当作已设置，免得把人带去“设置密码”）
  return <PasscodeLogin needsSetup={!error && state !== "set"} />;
}
