import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocument, LEGAL_CONTACT_EMAIL, type LegalSection } from "@/components/legal/LegalDocument";

export const metadata: Metadata = {
  title: "Informed Consent | NauriCare",
  description: "What you agree to when you use NauriCare's AI triage, electronic health records and remote consultations.",
};

const sections: LegalSection[] = [
  {
    id: "ai-triage",
    title: "AI symptom triage",
    body: (
      <>
        <p>
          When you log symptoms, NauriCare sends them to an AI model to estimate how urgently you should seek care. Our
          primary model is Google&apos;s <strong>MedGemma</strong>, with Gemini as a backup. Fixed safety rules run every
          time as well. They can raise the urgency, but never lower it.
        </p>
        <p><strong>You understand that AI triage:</strong></p>
        <ul>
          <li>is not a diagnosis, and cannot examine you or run tests;</li>
          <li>can be wrong, including under- or over-estimating urgency;</li>
          <li>sees only what you type, so leaving out details can change the result;</li>
          <li>never replaces a qualified clinician, and is never a reason to delay emergency care.</li>
        </ul>
        <p>
          Your symptom text is sent to the model provider to generate the result. We do not include your name or contact
          details in that request.
        </p>
      </>
    ),
  },
  {
    id: "ehr",
    title: "Electronic health records",
    body: (
      <>
        <p>NauriCare keeps an electronic record of your symptom logs, uploaded documents, appointments, prescriptions and referrals. Access works like this:</p>
        <ul>
          <li><strong>You</strong> can always see your own record.</li>
          <li><strong>Providers</strong> can see it only when they have an appointment with you, and only for your care.</li>
          <li><strong>Administrators</strong> may access records only for support, safety or legal reasons. That access is recorded in an audit log.</li>
          <li><strong>Hospitals</strong> receive referral details only for the referrals you create.</li>
        </ul>
      </>
    ),
  },
  {
    id: "remote",
    title: "Remote consultations",
    body: (
      <>
        <p>By booking a teleconsultation, you consent to receive care by video or message. You understand that:</p>
        <ul>
          <li>the provider cannot physically examine you, and may refer you for in-person care;</li>
          <li>poor connectivity can lower the quality of a consultation or interrupt it;</li>
          <li>you should join from a private place, because others nearby may overhear;</li>
          <li>consultations are not recorded by NauriCare, but providers write clinical notes in your record.</li>
        </ul>
      </>
    ),
  },
  {
    id: "referrals",
    title: "Hospital referrals",
    body: (
      <p>
        When you create a referral, you consent to NauriCare sharing your referral reason, triage severity and insurance
        details with the hospital you choose. We save a fixed copy of your insurance details at that moment, so the
        hospital sees exactly what you confirmed.
      </p>
    ),
  },
  {
    id: "withdraw",
    title: "Withdrawing consent",
    body: (
      <p>
        Your consent is voluntary. You can stop using AI triage or teleconsultations at any time, or withdraw consent
        entirely by emailing <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>. Withdrawal does not
        affect care you have already received, or records we must keep by law. See the{" "}
        <Link href="/privacy">Privacy Policy</Link> for all your data rights.
      </p>
    ),
  },
];

export default function ConsentPage() {
  return (
    <LegalDocument
      eyebrow="Legal"
      title="Informed Consent"
      current="/consent"
      intro={<p>Before you use AI triage, health records or remote consultations, here is what each one involves and what its limits are.</p>}
      sections={sections}
    />
  );
}
