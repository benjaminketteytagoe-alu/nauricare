import { Button, Heading, Hr, Section, Text } from "@react-email/components";
import { EmailShell } from "./EmailShell";

export interface PatientBookingConfirmationProps {
  patientName: string;
  providerName: string;
  date: string;
  time: string;
  meetingLink: string;
}

export function PatientBookingConfirmation({
  patientName,
  providerName,
  date,
  time,
  meetingLink,
}: PatientBookingConfirmationProps) {
  return (
    <EmailShell
      preview={`Your NauriCare appointment with ${providerName} is confirmed for ${date}`}
      footer={
        <>
          <Text className="text-center text-ink-muted text-xs mt-6">
            You&apos;re receiving this because you booked an appointment on NauriCare.
          </Text>
        </>
      }
    >
      <Heading className="text-ink text-xl font-semibold mt-0 mb-2">Appointment Confirmed ✓</Heading>
      <Text className="text-ink-soft text-sm leading-relaxed mt-0">
        Hi {patientName}, your telehealth appointment has been booked successfully.
      </Text>

      <Hr className="border-hairline my-6" />

      {/* Appointment details */}
      <Section className="bg-brand-soft rounded-xl px-6 py-5 mb-6">
        <Text className="text-xs font-semibold text-brand-ink uppercase tracking-wider m-0 mb-3">
          Appointment Details
        </Text>
        <table width="100%">
          <tbody>
            <tr>
              <td className="text-sm text-ink-muted pb-2 pr-4 whitespace-nowrap">Provider</td>
              <td className="text-sm font-semibold text-ink pb-2">{providerName}</td>
            </tr>
            <tr>
              <td className="text-sm text-ink-muted pb-2 pr-4 whitespace-nowrap">Date</td>
              <td className="text-sm font-semibold text-ink pb-2">{date}</td>
            </tr>
            <tr>
              <td className="text-sm text-ink-muted pr-4 whitespace-nowrap">Time</td>
              <td className="text-sm font-semibold text-ink">{time}</td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Text className="text-ink-soft text-sm leading-relaxed mb-6">
        Your consultation will take place via secure video call. Use the button below to join at your scheduled time —
        no downloads required.
      </Text>

      <Button
        href={meetingLink}
        className="bg-brand text-on-brand text-sm font-semibold rounded-xl px-6 py-3 no-underline text-center block"
      >
        Join Video Consultation
      </Button>

      <Text className="text-ink-muted text-xs mt-6 mb-0">
        If you need to reschedule, please contact us at least 24 hours in advance through your NauriCare dashboard.
      </Text>
    </EmailShell>
  );
}
