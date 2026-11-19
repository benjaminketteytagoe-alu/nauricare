import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Tailwind, Text } from "@react-email/components";

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
    <Html lang="en">
      <Head />
      <Preview>{heading}</Preview>
      <Tailwind>
        <Body className="bg-gray-50 font-sans">
          <Container className="mx-auto max-w-lg px-4 py-8">
            <Section className="rounded-t-2xl bg-[#1D4ED8] px-8 py-6">
              <Heading className="m-0 text-xl font-bold text-white">NauriCare</Heading>
              <Text className="mb-0 mt-1 text-sm text-blue-100">Women&apos;s health, connected</Text>
            </Section>
            <Section className="rounded-b-2xl border border-gray-100 bg-white px-8 py-6">
              <Text className="mt-0 text-base text-gray-800">Hi {name},</Text>
              <Heading as="h2" className="text-lg font-bold text-gray-900">{heading}</Heading>
              <Text className="text-sm leading-relaxed text-gray-700">{body}</Text>
              <Button href={ctaUrl} className="mt-2 rounded-full bg-[#1D4ED8] px-6 py-3 text-sm font-semibold text-white">{ctaLabel}</Button>
              <Hr className="my-6 border-gray-200" />
              <Text className="m-0 text-xs text-gray-500">
                You&apos;re receiving this because reminders are on in your NauriCare settings. You can change or turn them off at{" "}
                {settingsUrl}.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
