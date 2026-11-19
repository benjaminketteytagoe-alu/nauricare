import { Body, Container, Head, Heading, Hr, Html, Preview, Section, Tailwind, Text } from "@react-email/components";

export interface FeedbackNotificationProps {
  userName: string;
  userEmail: string;
  userRole: string;
  category: string;
  rating: number;
  ratingLabel: string;
  message: string;
  submittedAt: string;
  feedbackId: string;
}

// Internal notification to the NauriCare inbox. All values are rendered as
// text nodes, so React Email escapes them: user input cannot inject markup.
export function FeedbackNotification(props: FeedbackNotificationProps) {
  const rows: [string, string][] = [
    ["From", `${props.userName} (${props.userRole.toLowerCase()})`],
    ["Email", props.userEmail],
    ["Category", props.category],
    ["Rating", `${props.rating}/5 · ${props.ratingLabel}`],
    ["Submitted", props.submittedAt],
    ["Reference", props.feedbackId],
  ];
  return (
    <Html lang="en">
      <Head />
      <Preview>{`${props.category} feedback, ${props.rating}/5, from ${props.userName}`}</Preview>
      <Tailwind>
        <Body className="bg-gray-50 font-sans">
          <Container className="mx-auto max-w-lg px-4 py-8">
            <Section className="rounded-t-2xl bg-[#1D4ED8] px-8 py-6">
              <Heading className="m-0 text-xl font-bold text-white">New NauriCare feedback</Heading>
              <Text className="mb-0 mt-1 text-sm text-blue-100">{props.category}</Text>
            </Section>
            <Section className="rounded-b-2xl border border-gray-100 bg-white px-8 py-6">
              {rows.map(([label, value]) => (
                <Text key={label} className="my-1 text-sm text-gray-700">
                  <strong className="text-gray-900">{label}:</strong> {value}
                </Text>
              ))}
              <Hr className="my-5 border-gray-200" />
              <Text className="mb-1 mt-0 text-sm font-semibold text-gray-900">Message</Text>
              <Text className="mt-0 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{props.message}</Text>
            </Section>
            <Text className="text-center text-xs text-gray-400">Reply to this email to respond to the user directly.</Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
