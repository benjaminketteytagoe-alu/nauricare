import { Button, Heading, Hr, Section, Text } from "@react-email/components";
import { SITE_URL } from "@/lib/site";
import { EmailShell } from "./EmailShell";

export interface ProviderNewAppointmentAlertProps {
  providerName: string;
  patientName: string;
  date: string;
  time: string;
  meetingLink: string;
}

export function ProviderNewAppointmentAlert({
  providerName,
  patientName,
  date,
  time,
  meetingLink,
}: ProviderNewAppointmentAlertProps) {
  return (
    <EmailShell
      preview={`New patient booking: ${patientName} on ${date} at ${time}`}
      footer={
        <>
          <Text className="text-center text-ink-muted text-xs mt-6">
            You&apos;re receiving this as a verified NauriCare provider.
          </Text>
        </>
      }
    >
      <Heading className="text-ink text-xl font-semibold mt-0 mb-2">New Appointment Booked</Heading>
      <Text className="text-ink-soft text-sm leading-relaxed mt-0">
        Hi {providerName}, a patient has booked a telehealth consultation with you. Review the details below and make
        sure you&apos;re available.
      </Text>

      <Hr className="border-hairline my-6" />

      {/* Appointment details */}
      <Section className="bg-surface-muted rounded-xl px-6 py-5 mb-6 border border-hairline">
        <Text className="text-xs font-semibold text-ink-muted uppercase tracking-wider m-0 mb-3">Booking Summary</Text>
        <table width="100%">
          <tbody>
            <tr>
              <td className="text-sm text-ink-muted pb-2 pr-4 whitespace-nowrap">Patient</td>
              <td className="text-sm font-semibold text-ink pb-2">{patientName}</td>
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
        The consultation room is ready. Join at the scheduled time using the secure link below — the patient has
        received the same link.
      </Text>

      <Button
        href={meetingLink}
        className="bg-brand text-on-brand text-sm font-semibold rounded-xl px-6 py-3 no-underline text-center block"
      >
        Open Consultation Room
      </Button>

      <Text className="text-ink-muted text-xs mt-6 mb-0">
        Manage your full schedule from the{" "}
        <a href={`${SITE_URL}/provider`} className="text-brand-ink">
          NauriCare Clinical Portal
        </a>
        .
      </Text>
    </EmailShell>
  );
}
