import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocument, type LegalSection } from "@/components/legal/LegalDocument";

export const metadata: Metadata = {
  title: "Terms of Use | NauriCare",
  description: "The rules for using NauriCare, the scope of teleconsultations, and the provider-patient relationship.",
};

const sections: LegalSection[] = [
  {
    id: "acceptance",
    title: "Accepting these terms",
    body: (
      <p>
        By creating an account or using NauriCare, you agree to these Terms of Use, our{" "}
        <Link href="/privacy">Privacy Policy</Link> and our <Link href="/consent">Informed Consent</Link>. If you do not
        agree, please do not use the platform.
      </p>
    ),
  },
  {
    id: "eligibility",
    title: "Who can use NauriCare",
    body: (
      <ul>
        <li>Patients must be at least 18 years old, or use NauriCare with a parent or legal guardian.</li>
        <li>Providers must hold a current licence from the relevant Rwandan professional council, and must pass our verification before they can see patients.</li>
        <li>You must give accurate information and keep it up to date.</li>
      </ul>
    ),
  },
  {
    id: "not-emergency",
    title: "Not an emergency service",
    body: (
      <p>
        <strong>NauriCare is not for medical emergencies.</strong> If you have severe bleeding, severe pain, difficulty
        breathing, fainting or thoughts of self-harm, call SAMU Rwanda on <a href="tel:912">112 / 912</a> or go to the
        nearest emergency department.
      </p>
    ),
  },
  {
    id: "teleconsultation",
    title: "Scope of teleconsultations",
    body: (
      <>
        <p>Teleconsultations are video or message consultations with a licensed provider. They have limits:</p>
        <ul>
          <li>A provider cannot physically examine you, so some conditions need an in-person visit.</li>
          <li>A provider may decide that remote care is not suitable and refer you to a hospital or clinic.</li>
          <li>Prescriptions are issued only at the provider&apos;s clinical discretion, within Rwandan law.</li>
          <li>Connectivity problems can interrupt a session. The provider may then reschedule or continue by message.</li>
        </ul>
      </>
    ),
  },
  {
    id: "relationship",
    title: "The provider-patient relationship",
    body: (
      <>
        <p>
          When you book a consultation, the care relationship is between <strong>you and that provider</strong>. Providers
          are independent professionals. They are solely responsible for their clinical judgement, advice, diagnoses and
          prescriptions.
        </p>
        <p>
          NauriCare provides the technology that connects you. It does not practise medicine and does not direct
          providers&apos; clinical decisions. Providers must keep patient information confidential, keep accurate records,
          and act within the scope of their licence.
        </p>
      </>
    ),
  },
  {
    id: "ai",
    title: "AI triage and health content",
    body: (
      <p>
        AI triage, articles and community posts are for information only. They are not a diagnosis or a treatment plan.
        AI can be wrong. Always discuss health decisions with a qualified clinician. The{" "}
        <Link href="/consent">Informed Consent</Link> explains the limits of AI triage in detail.
      </p>
    ),
  },
  {
    id: "referrals",
    title: "Hospital referrals",
    body: (
      <p>
        A NauriCare referral code tells the hospital why you are coming and how you plan to pay. It does not guarantee an
        appointment, a particular specialist, or that your insurer will cover the visit. Confirm availability and coverage
        with the hospital and your insurer.
      </p>
    ),
  },
  {
    id: "conduct",
    title: "Your responsibilities",
    body: (
      <ul>
        <li>Keep your password private, and tell us straight away if you think your account has been accessed by someone else.</li>
        <li>Do not harass anyone, impersonate a clinician, or post false medical claims in the community.</li>
        <li>Do not try to access other users&apos; data or disrupt the platform.</li>
        <li>We may suspend accounts that break these rules or put other users at risk.</li>
      </ul>
    ),
  },
  {
    id: "liability",
    title: "Limitation of liability",
    body: (
      <p>
        We work to keep NauriCare available and accurate, but we provide the platform &quot;as is&quot;. To the extent the
        law allows, NauriCare is not liable for clinical decisions made by independent providers, or for indirect losses.
        Nothing in these terms limits liability that cannot be limited under Rwandan law.
      </p>
    ),
  },
  {
    id: "law",
    title: "Governing law and changes",
    body: (
      <p>
        These terms are governed by the laws of the Republic of Rwanda, and the competent courts of Rwanda handle any
        dispute. We may update these terms. When a change is significant, we will tell you before it takes effect.
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalDocument
      eyebrow="Legal"
      title="Terms of Use"
      current="/terms"
      intro={<p>These terms explain how NauriCare works, what teleconsultations can and cannot do, and who is responsible for your care.</p>}
      sections={sections}
    />
  );
}
