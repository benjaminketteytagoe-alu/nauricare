import { Hr, Text } from "@react-email/components";
import { EmailShell } from "./EmailShell";

export interface LoginCodeProps {
  name: string;
  code: string;
  minutes: number;
}

export function LoginCode({ name, code, minutes }: LoginCodeProps) {
  return (
    <EmailShell preview={`Your NauriCare sign-in code is ${code}`}>
      <Text className="mt-0 text-base text-ink">Hi {name},</Text>
      <Text className="text-sm text-ink-soft">Use this code to finish signing in:</Text>
      <Text className="my-4 text-center font-mono text-4xl font-bold tracking-[0.4em] text-ink">{code}</Text>
      <Text className="text-sm text-ink-soft">
        It expires in {minutes} minutes. Never share this code with anyone, including NauriCare staff.
      </Text>
      <Hr className="my-6 border-hairline" />
      <Text className="m-0 text-xs text-ink-muted">
        If you didn&apos;t try to sign in, someone may know your password. Change it from the login page and contact us.
      </Text>
    </EmailShell>
  );
}
