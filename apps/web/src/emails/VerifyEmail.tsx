import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";

export interface VerifyEmailProps {
  name: string;
  verifyUrl: string;
}

export function VerifyEmail({ name, verifyUrl }: VerifyEmailProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>Verify your email to finish setting up your NauriCare account</Preview>
      <Tailwind>
        <Body className="bg-gray-50 font-sans">
          <Container className="mx-auto max-w-lg py-8 px-4">

            {/* Header */}
            <Section className="bg-teal-700 rounded-t-2xl px-8 py-6 text-center">
              <Heading className="text-white text-2xl font-bold m-0">
                NauriCare
              </Heading>
              <Text className="text-teal-100 text-sm mt-1 mb-0">
                Women&apos;s Health Platform
              </Text>
            </Section>

            {/* Body card */}
            <Section className="bg-white rounded-b-2xl px-8 py-8 shadow-sm border border-gray-100">
              <Heading className="text-gray-900 text-xl font-semibold mt-0 mb-2">
                Welcome to NauriCare, {name} 👋
              </Heading>
              <Text className="text-gray-600 text-sm leading-relaxed mt-0">
                Thanks for joining NauriCare. Please verify your email address to activate
                your account and get started.
              </Text>

              <Hr className="border-gray-100 my-6" />

              <Button
                href={verifyUrl}
                className="bg-teal-600 text-white text-sm font-semibold rounded-xl px-6 py-3 no-underline text-center block"
              >
                Verify Email Address
              </Button>

              <Text className="text-gray-400 text-xs mt-6 mb-0">
                This link expires in 24 hours. If you didn&apos;t create a NauriCare account,
                you can safely ignore this email.
              </Text>
            </Section>

            {/* Footer */}
            <Text className="text-center text-gray-400 text-xs mt-6">
              NauriCare · Secure Women&apos;s Health Platform
              <br />
              You&apos;re receiving this because this email was used to register a NauriCare account.
            </Text>

          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

export default VerifyEmail;
