import { Heading, Hr, Text } from "@react-email/components";
import { EmailShell } from "./EmailShell";

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
    <EmailShell
      preview={`${props.category} feedback, ${props.rating}/5, from ${props.userName}`}
      footer={
        <>
          <Text className="text-center text-xs text-ink-muted">
            Reply to this email to respond to the user directly.
          </Text>
        </>
      }
    >
      <Heading as="h1" className="mb-1 mt-0 font-display text-xl font-bold text-ink">
        New feedback
      </Heading>
      <Text className="mb-4 mt-0 text-sm text-ink-muted">{props.category}</Text>
      {rows.map(([label, value]) => (
        <Text key={label} className="my-1 text-sm text-ink-soft">
          <strong className="text-ink">{label}:</strong> {value}
        </Text>
      ))}
      <Hr className="my-5 border-hairline" />
      <Text className="mb-1 mt-0 text-sm font-semibold text-ink">Message</Text>
      <Text className="mt-0 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">{props.message}</Text>
    </EmailShell>
  );
}
