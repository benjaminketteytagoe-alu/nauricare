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
    <Html lang="en">
      <Head />
      <Preview>New patient booking: {patientName} on {date} at {time}</Preview>
      <Tailwind>
        <Body className="bg-gray-50 font-sans">
          <Container className="mx-auto max-w-lg py-8 px-4">

            {/* Header */}
            <Section className="bg-teal-900 rounded-t-2xl px-8 py-6 text-center">
              <Heading className="text-white text-2xl font-bold m-0">
                NauriCare
              </Heading>
              <Text className="text-teal-300 text-sm mt-1 mb-0">
                Clinical Portal
              </Text>
            </Section>

            {/* Body card */}
            <Section className="bg-white rounded-b-2xl px-8 py-8 shadow-sm border border-gray-100">
              <Heading className="text-gray-900 text-xl font-semibold mt-0 mb-2">
                New Appointment Booked
              </Heading>
              <Text className="text-gray-600 text-sm leading-relaxed mt-0">
                Hi {providerName}, a patient has booked a telehealth consultation with you.
                Review the details below and make sure you&apos;re available.
              </Text>

              <Hr className="border-gray-100 my-6" />

              {/* Appointment details */}
              <Section className="bg-gray-50 rounded-xl px-6 py-5 mb-6 border border-gray-100">
                <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wider m-0 mb-3">
                  Booking Summary
                </Text>
                <table width="100%">
                  <tbody>
                    <tr>
                      <td className="text-sm text-gray-500 pb-2 pr-4 whitespace-nowrap">Patient</td>
                      <td className="text-sm font-semibold text-gray-900 pb-2">{patientName}</td>
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
                The consultation room is ready. Join at the scheduled time using the secure
                link below — the patient has received the same link.
              </Text>

              <Button
                href={meetingLink}
                className="bg-teal-700 text-white text-sm font-semibold rounded-xl px-6 py-3 no-underline text-center block"
              >
                Open Consultation Room
              </Button>

              <Text className="text-gray-400 text-xs mt-6 mb-0">
                Manage your full schedule from the{" "}
                <a href="https://nauricare.com/provider" className="text-teal-600">
                  NauriCare Clinical Portal
                </a>.
              </Text>
            </Section>

            {/* Footer */}
            <Text className="text-center text-gray-400 text-xs mt-6">
              NauriCare · Secure Women&apos;s Health Platform
              <br />
              You&apos;re receiving this as a verified NauriCare provider.
            </Text>

          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

export default ProviderNewAppointmentAlert;
