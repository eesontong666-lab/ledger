import { BackHeader } from "@/components/mobile/ui";
import { PasscodeSettings } from "@/components/mobile/PasscodeSettings";

export default function SecurityPage() {
  return (
    <>
      <BackHeader title="密码锁" href="/settings" />
      <PasscodeSettings />
    </>
  );
}
