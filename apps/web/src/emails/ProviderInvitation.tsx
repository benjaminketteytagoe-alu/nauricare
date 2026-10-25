import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Tailwind, Text } from "@react-email/components";

export interface ProviderInvitationProps {
  name: string;
  facility: string | null;
  claimUrl: string;
  alreadyListed: boolean;
  expiresOn: string;
}

export function ProviderInvitation({ name, facility, claimUrl, alreadyListed, expiresOn }: ProviderInvitationProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{alreadyListed ? "Set up your NauriCare provider account" : "You're invited to join NauriCare as a women's health specialist"}</Preview>
      <Tailwind>
        <Body className="bg-gray-50 font-sans">
          <Container className="mx-auto max-w-lg px-4 py-8">
            <Section className="rounded-t-2xl bg-[#1D4ED8] px-8 py-6">
              <Heading className="m-0 text-xl font-bold text-white">NauriCare</Heading>
              <Text className="mb-0 mt-1 text-sm text-blue-100">Women&apos;s health, connected</Text>
            </Section>
            <Section className="rounded-b-2xl border border-gray-100 bg-white px-8 py-6">
              <Text className="mt-0 text-base text-gray-800">Dear {name},</Text>
              <Text className="text-sm leading-relaxed text-gray-700">
                {alreadyListed
                  ? `Following our conversation, your NauriCare specialist profile${facility ? ` at ${facility}` : ""} has been created. Use the button below to set your password and confirm your details.`
                  : `NauriCare helps women in Rwanda find trusted gynaecologists, book consultations and get hospital referrals. We found your public professional listing${facility ? ` at ${facility}` : ""} and would like to invite you to join as a verified specialist.`}
              </Text>
              <Text className="text-sm leading-relaxed text-gray-700">
                Your profile is only shown to patients after you accept. You can review the details we found before agreeing.
              </Text>
              <Button href={claimUrl} className="mt-2 rounded-full bg-[#1D4ED8] px-6 py-3 text-sm font-semibold text-white">
                {alreadyListed ? "Set up my account" : "Review and accept invitation"}
              </Button>
              <Hr className="my-6 border-gray-200" />
              <Text className="m-0 text-xs text-gray-500">
                This link expires on {expiresOn}. If you don&apos;t want to be contacted again, simply ignore this email and we
                will not list you.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
