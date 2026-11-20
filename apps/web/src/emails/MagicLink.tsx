import { Button, Heading, Hr, Text } from "@react-email/components";
import { EmailShell } from "./EmailShell";

export interface MagicLinkProps {
  url: string;
}

export function MagicLink({ url }: MagicLinkProps) {
  return (
    <EmailShell
      preview={"Your secure NauriCare login link — expires in 10 minutes"}
      footer={
        <>
          <Text className="text-center text-ink-muted text-xs mt-6">
            You&apos;re receiving this because a login link was requested for your account.
          </Text>
        </>
      }
    >
      <Heading className="text-ink text-xl font-semibold mt-0 mb-2">Your login link</Heading>
      <Text className="text-ink-soft text-sm leading-relaxed mt-0">
        Click the button below to securely sign in to your NauriCare account — no password needed.
      </Text>

      <Hr className="border-hairline my-6" />

      <Button
        href={url}
        className="bg-brand text-on-brand text-sm font-semibold rounded-xl px-6 py-3 no-underline text-center block"
      >
        Sign In to NauriCare
      </Button>

      <Text className="text-ink-muted text-xs mt-6 mb-0">
        This link expires in 10 minutes and can only be used once. If you didn&apos;t request this, you can safely
        ignore this email.
      </Text>
    </EmailShell>
  );
}
