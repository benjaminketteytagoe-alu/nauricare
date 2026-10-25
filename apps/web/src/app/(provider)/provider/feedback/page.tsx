import { FeedbackView } from "@/components/feedback/FeedbackView";

export const dynamic = "force-dynamic";
export const metadata = { title: "Feedback | NauriCare" };

export default function ProviderFeedbackPage() {
  return <FeedbackView role="PROVIDER" />;
}
