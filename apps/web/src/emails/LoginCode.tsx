import { Body, Container, Head, Heading, Hr, Html, Preview, Section, Tailwind, Text } from "@react-email/components";

export interface LoginCodeProps {
  name: string;
  code: string;
  minutes: number;
}

export function LoginCode({ name, code, minutes }: LoginCodeProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{`Your NauriCare sign-in code is ${code}`}</Preview>
      <Tailwind>
        <Body className="bg-gray-50 font-sans">
          <Container className="mx-auto max-w-lg px-4 py-8">
            <Section className="rounded-t-2xl bg-[#1D4ED8] px-8 py-6">
              <Heading className="m-0 text-xl font-bold text-white">NauriCare</Heading>
            </Section>
            <Section className="rounded-b-2xl border border-gray-100 bg-white px-8 py-6">
              <Text className="mt-0 text-base text-gray-800">Hi {name},</Text>
              <Text className="text-sm text-gray-700">Use this code to finish signing in:</Text>
              <Text className="my-4 text-center font-mono text-4xl font-bold tracking-[0.4em] text-gray-900">{code}</Text>
              <Text className="text-sm text-gray-700">It expires in {minutes} minutes. Never share this code with anyone, including NauriCare staff.</Text>
              <Hr className="my-6 border-gray-200" />
              <Text className="m-0 text-xs text-gray-500">
                If you didn&apos;t try to sign in, someone may know your password. Change it from the login page and contact us.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
