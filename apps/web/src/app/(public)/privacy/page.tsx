import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocument, LEGAL_CONTACT_EMAIL, type LegalSection } from "@/components/legal/LegalDocument";

export const metadata: Metadata = {
  title: "Privacy Policy | NauriCare",
  description: "How NauriCare collects, protects and uses your health data, and the rights you have over it.",
};

const sections: LegalSection[] = [
  {
    id: "scope",
    title: "Who we are and what this covers",
    body: (
      <>
        <p>
          NauriCare is a digital women&apos;s health platform. It connects patients with independent, licensed healthcare
          providers for PCOS, fibroids, endometriosis and menstrual health. This policy covers the NauriCare website,
          the patient and provider portals, and any NauriCare emails.
        </p>
        <p>
          NauriCare is the <strong>data controller</strong> for the personal data described here. Providers who consult
          with you through NauriCare are also responsible for the clinical records they create.
        </p>
      </>
    ),
  },
  {
    id: "framework",
    title: "Legal framework",
    body: (
      <>
        <p>
          We process personal data in line with Rwanda&apos;s <strong>Law N° 058/2021 of 13/10/2021 relating to the
          protection of personal data and privacy</strong>, which is supervised by the National Cyber Security Authority.
        </p>
        <p>
          We also design our controls to align with two international standards, the EU General Data Protection
          Regulation (GDPR) and the US HIPAA Privacy and Security Rules. We follow their principles of data minimisation,
          access control, audit logging and breach response. Alignment is a design commitment. It does not mean those
          laws apply to every user, or that a regulator has certified us.
        </p>
      </>
    ),
  },
  {
    id: "data",
    title: "Data we collect",
    body: (
      <ul>
        <li><strong>Account data:</strong> name, email, phone number, date of birth, country and password. We store passwords only as a one-way bcrypt hash.</li>
        <li><strong>Health data:</strong> symptom logs, cycle and habit tracking, health records you upload, prescriptions, appointment notes and AI triage results.</li>
        <li><strong>Referral and insurance data:</strong> your insurer, policy number, principal member and card expiry date, plus the referrals you create.</li>
        <li><strong>Communications:</strong> messages with providers, community posts and comments, and feedback you send us.</li>
        <li><strong>Technical data:</strong> IP address, device and browser details, and security signals used to block automated abuse.</li>
      </ul>
    ),
  },
  {
    id: "use",
    title: "How we use your data",
    body: (
      <>
        <ul>
          <li>To provide care: booking teleconsultations, sharing records with the providers you consult, and issuing hospital referrals.</li>
          <li>To run AI triage on the symptoms you log, so we can suggest how urgently to seek care.</li>
          <li>To keep the platform secure, prevent fraud and meet our legal obligations.</li>
          <li>To improve NauriCare using aggregated, de-identified statistics.</li>
        </ul>
        <p>
          Health data is sensitive personal data. We process it on the basis of your <strong>explicit consent</strong> and
          for the provision of healthcare. <strong>We never sell your data, and we never use your health data for
          advertising.</strong>
        </p>
      </>
    ),
  },
  {
    id: "sharing",
    title: "Who we share it with",
    body: (
      <>
        <ul>
          <li><strong>Your providers:</strong> clinicians can see your records only when they have an appointment with you.</li>
          <li><strong>Hospitals you choose:</strong> when you create a referral, the hospital receives your referral reason, triage severity and insurance details.</li>
          <li>
            <strong>Service providers</strong> who process data on our instructions under contract: database and file
            hosting, email delivery, video consultation, bot protection, and AI model providers (Google MedGemma and
            Gemini) for triage.
          </li>
          <li><strong>Authorities</strong>, only when the law requires it.</li>
        </ul>
        <p>
          Some service providers process data outside Rwanda. Where they do, we rely on the safeguards for cross-border
          transfers that Law N° 058/2021 requires.
        </p>
      </>
    ),
  },
  {
    id: "security",
    title: "How we protect it",
    body: (
      <ul>
        <li><strong>Encryption in transit:</strong> all traffic to NauriCare uses HTTPS (TLS).</li>
        <li><strong>Encryption at rest:</strong> our database and file storage providers encrypt stored data.</li>
        <li><strong>Access control:</strong> role-based access separates patients, providers and administrators. Each portal is checked again on the server.</li>
        <li><strong>Audit trail:</strong> administrative and provider access to records is logged for compliance review.</li>
        <li><strong>Account security:</strong> password-reset links expire after one hour, and we store only a hash of each reset token.</li>
      </ul>
    ),
  },
  {
    id: "rights",
    title: "Your rights",
    body: (
      <>
        <p>You have the right to:</p>
        <ul>
          <li>access a copy of your personal data;</li>
          <li>correct data that is wrong or incomplete;</li>
          <li>ask us to delete your data, subject to legal record-keeping duties;</li>
          <li>object to or restrict certain processing;</li>
          <li>receive your data in a portable format;</li>
          <li>withdraw your consent at any time. Withdrawal does not affect processing that already took place.</li>
        </ul>
        <p>
          Email <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a> to use these rights. If you are
          unhappy with our response, you can complain to the National Cyber Security Authority.
        </p>
      </>
    ),
  },
  {
    id: "retention",
    title: "How long we keep it",
    body: (
      <p>
        We keep your data while your account is active. We keep clinical records for as long as Rwandan health
        regulations require, even after you close your account. When data is no longer needed, we delete or anonymise it.
      </p>
    ),
  },
  {
    id: "breach",
    title: "Data breaches",
    body: (
      <p>
        If a breach puts your rights at risk, we will notify the supervisory authority and affected users within the
        time the law requires. We will tell you what happened and the steps you can take.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes to this policy",
    body: (
      <p>
        We will post any update on this page and change the effective date. If a change is significant, we will tell you
        by email or in the app before it takes effect. See also our <Link href="/terms">Terms of Use</Link> and{" "}
        <Link href="/consent">Informed Consent</Link>.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalDocument
      eyebrow="Legal"
      title="Privacy Policy"
      current="/privacy"
      intro={
        <p>
          Your health information is personal. This policy explains what we collect, why we collect it, how we protect it,
          and how you stay in control.
        </p>
      }
      sections={sections}
    />
  );
}
