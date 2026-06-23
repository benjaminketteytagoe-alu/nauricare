import { Resend } from "resend";
import { PatientBookingConfirmation, type PatientBookingConfirmationProps } from "@/emails/PatientBookingConfirmation";
import { ProviderNewAppointmentAlert, type ProviderNewAppointmentAlertProps } from "@/emails/ProviderNewAppointmentAlert";
import { PasswordReset, type PasswordResetProps } from "@/emails/PasswordReset";

const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key_for_build');

// Use the verified domain in production; fall back to Resend's test sender in dev.
const FROM_ADDRESS =
  process.env.EMAIL_FROM ?? "appointments@nauricare.com";

export async function sendPatientConfirmationEmail({
  to,
  ...props
}: PatientBookingConfirmationProps & { to: string }) {
  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: `Your NauriCare appointment with ${props.providerName} is confirmed`,
    react: PatientBookingConfirmation(props),
  });

  if (error) throw new Error(`[RESEND] Patient confirmation failed: ${error.message}`);
}

export async function sendProviderAlertEmail({
  to,
  ...props
}: ProviderNewAppointmentAlertProps & { to: string }) {
  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: `New booking: ${props.patientName} on ${props.date} at ${props.time}`,
    react: ProviderNewAppointmentAlert(props),
  });

  if (error) throw new Error(`[RESEND] Provider alert failed: ${error.message}`);
}

export async function sendPasswordResetEmail({
  to,
  ...props
}: PasswordResetProps & { to: string }) {
  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: "Reset your NauriCare password",
    react: PasswordReset(props),
  });

  if (error) throw new Error(`[RESEND] Password reset email failed: ${error.message}`);
}
