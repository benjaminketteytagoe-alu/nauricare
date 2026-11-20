import { Button, Heading, Hr, Text } from "@react-email/components";
import { EmailShell } from "./EmailShell";

export interface PasswordResetProps {
  resetUrl: string;
}

export function PasswordReset({ resetUrl }: PasswordResetProps) {
  return (
    <EmailShell
      preview={"Reset your NauriCare password — this link expires in 10 minutes"}
      footer={
        <>
          <Text className="text-center text-ink-muted text-xs mt-6">
            You&apos;re receiving this because a password reset was requested for your account.
          </Text>
        </>
      }
    >
      <Heading className="text-ink text-xl font-semibold mt-0 mb-2">Reset your password</Heading>
      <Text className="text-ink-soft text-sm leading-relaxed mt-0">
        We received a request to reset your NauriCare password. Click the button below to choose a new one.
      </Text>

      <Hr className="border-hairline my-6" />

      <Button
        href={resetUrl}
        className="bg-brand text-on-brand text-sm font-semibold rounded-xl px-6 py-3 no-underline text-center block"
      >
        Reset Password
      </Button>

      <Text className="text-ink-muted text-xs mt-6 mb-0">
        This link expires in 10 minutes. If you didn&apos;t request a password reset, you can safely ignore this email —
        your password will remain unchanged.
      </Text>
    </EmailShell>
  );
}
