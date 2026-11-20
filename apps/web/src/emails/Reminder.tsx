import { Button, Heading, Hr, Text } from "@react-email/components";
import { EmailShell } from "./EmailShell";

export interface ReminderEmailProps {
  name: string;
  heading: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
  settingsUrl: string;
}

/** Generic reminder (period, daily log, weekly insight, appointment). */
export function ReminderEmail({ name, heading, body, ctaLabel, ctaUrl, settingsUrl }: ReminderEmailProps) {
  return (
    <EmailShell preview={heading}>
      <Text className="mt-0 text-base text-ink">Hi {name},</Text>
      <Heading as="h2" className="text-lg font-bold text-ink">
        {heading}
      </Heading>
      <Text className="text-sm leading-relaxed text-ink-soft">{body}</Text>
      <Button href={ctaUrl} className="mt-2 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-on-brand">
        {ctaLabel}
      </Button>
      <Hr className="my-6 border-hairline" />
      <Text className="m-0 text-xs text-ink-muted">
        You&apos;re receiving this because reminders are on in your NauriCare settings. You can change or turn them off
        at {settingsUrl}.
      </Text>
    </EmailShell>
  );
}
