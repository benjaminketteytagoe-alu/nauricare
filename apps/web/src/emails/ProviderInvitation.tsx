import { Button, Hr, Text } from "@react-email/components";
import { EmailShell } from "./EmailShell";

export interface ProviderInvitationProps {
  name: string;
  facility: string | null;
  claimUrl: string;
  alreadyListed: boolean;
  expiresOn: string;
}

export function ProviderInvitation({ name, facility, claimUrl, alreadyListed, expiresOn }: ProviderInvitationProps) {
  return (
    <EmailShell
      preview={
        alreadyListed
          ? "Set up your NauriCare provider account"
          : "You're invited to join NauriCare as a women's health specialist"
      }
    >
      <Text className="mt-0 text-base text-ink">Dear {name},</Text>
      <Text className="text-sm leading-relaxed text-ink-soft">
        {alreadyListed
          ? `Following our conversation, your NauriCare specialist profile${facility ? ` at ${facility}` : ""} has been created. Use the button below to set your password and confirm your details.`
          : `NauriCare helps women in Rwanda find trusted gynaecologists, book consultations and get hospital referrals. We found your public professional listing${facility ? ` at ${facility}` : ""} and would like to invite you to join as a verified specialist.`}
      </Text>
      <Text className="text-sm leading-relaxed text-ink-soft">
        Your profile is only shown to patients after you accept. You can review the details we found before agreeing.
      </Text>
      <Button href={claimUrl} className="mt-2 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-on-brand">
        {alreadyListed ? "Set up my account" : "Review and accept invitation"}
      </Button>
      <Hr className="my-6 border-hairline" />
      <Text className="m-0 text-xs text-ink-muted">
        This link expires on {expiresOn}. If you don&apos;t want to be contacted again, simply ignore this email and we
        will not list you.
      </Text>
    </EmailShell>
  );
}
