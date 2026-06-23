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

export interface PasswordResetProps {
  resetUrl: string;
}

export function PasswordReset({ resetUrl }: PasswordResetProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>Reset your NauriCare password — this link expires in 10 minutes</Preview>
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
                Reset your password
              </Heading>
              <Text className="text-gray-600 text-sm leading-relaxed mt-0">
                We received a request to reset your NauriCare password. Click the button below
                to choose a new one.
              </Text>

              <Hr className="border-gray-100 my-6" />

              <Button
                href={resetUrl}
                className="bg-teal-600 text-white text-sm font-semibold rounded-xl px-6 py-3 no-underline text-center block"
              >
                Reset Password
              </Button>

              <Text className="text-gray-400 text-xs mt-6 mb-0">
                This link expires in 10 minutes. If you didn&apos;t request a password reset,
                you can safely ignore this email — your password will remain unchanged.
              </Text>
            </Section>

            {/* Footer */}
            <Text className="text-center text-gray-400 text-xs mt-6">
              NauriCare · Secure Women&apos;s Health Platform
              <br />
              You&apos;re receiving this because a password reset was requested for your account.
            </Text>

          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

export default PasswordReset;
