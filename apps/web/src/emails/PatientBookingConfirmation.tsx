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
    <Html lang="en">
      <Head />
      <Preview>Your NauriCare appointment with {providerName} is confirmed for {date}</Preview>
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
                Appointment Confirmed ✓
              </Heading>
              <Text className="text-gray-600 text-sm leading-relaxed mt-0">
                Hi {patientName}, your telehealth appointment has been booked successfully.
              </Text>

              <Hr className="border-gray-100 my-6" />

              {/* Appointment details */}
              <Section className="bg-teal-50 rounded-xl px-6 py-5 mb-6">
                <Text className="text-xs font-semibold text-teal-600 uppercase tracking-wider m-0 mb-3">
                  Appointment Details
                </Text>
                <table width="100%">
                  <tbody>
                    <tr>
                      <td className="text-sm text-gray-500 pb-2 pr-4 whitespace-nowrap">Provider</td>
                      <td className="text-sm font-semibold text-gray-900 pb-2">{providerName}</td>
                    </tr>
                    <tr>
                      <td className="text-sm text-gray-500 pb-2 pr-4 whitespace-nowrap">Date</td>
                      <td className="text-sm font-semibold text-gray-900 pb-2">{date}</td>
                    </tr>
                    <tr>
                      <td className="text-sm text-gray-500 pr-4 whitespace-nowrap">Time</td>
                      <td className="text-sm font-semibold text-gray-900">{time}</td>
                    </tr>
                  </tbody>
                </table>
              </Section>

              <Text className="text-gray-600 text-sm leading-relaxed mb-6">
                Your consultation will take place via secure video call. Use the button below
                to join at your scheduled time — no downloads required.
              </Text>

              <Button
                href={meetingLink}
                className="bg-teal-600 text-white text-sm font-semibold rounded-xl px-6 py-3 no-underline text-center block"
              >
                Join Video Consultation
              </Button>

              <Text className="text-gray-400 text-xs mt-6 mb-0">
                If you need to reschedule, please contact us at least 24 hours in advance
                through your NauriCare dashboard.
              </Text>
            </Section>

            {/* Footer */}
            <Text className="text-center text-gray-400 text-xs mt-6">
              NauriCare · Secure Women&apos;s Health Platform
              <br />
              You&apos;re receiving this because you booked an appointment on NauriCare.
            </Text>

          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

export default PatientBookingConfirmation;
