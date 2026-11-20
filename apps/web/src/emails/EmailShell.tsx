import { Body, Container, Head, Html, Preview, Section, Tailwind, Text } from "@react-email/components";
import type { ReactNode } from "react";
import { SITE_LOCATION } from "@/lib/site";

// The warm editorial palette as plain hex: email clients can't read the CSS
// variables in tokens.css, so these mirror its light-mode values. Fraunces
// isn't available in mail clients; Georgia is the closest common serif.
const emailTailwind = {
  theme: {
    extend: {
      colors: {
        canvas: "#fbf7f4",
        surface: "#ffffff",
        "surface-muted": "#f5efeb",
        plum: "#2a1631",
        ink: "#2a1631",
        "ink-soft": "#4a3848",
        "ink-muted": "#6e5e67",
        "ink-inverse": "#fbf7f4",
        hairline: "#efe6e1",
        brand: "#b23a5b",
        "brand-ink": "#952f4b",
        "brand-soft": "#fbf2f4",
        "brand-line": "#eec5cf",
        "on-brand": "#ffffff",
        success: "#2f6b4f",
        "success-soft": "#eef6f1",
        warning: "#9a4a12",
        "warning-soft": "#fdf4ec",
        danger: "#b42318",
        "danger-soft": "#fef3f2",
      },
      fontFamily: { display: ["Georgia", "Times New Roman", "serif"] },
    },
  },
};

/** Every NauriCare email: plum wordmark header, white card, small print below. */
export function EmailShell({
  preview,
  children,
  footer,
}: {
  preview: string;
  children: ReactNode;
  /** Small print under the card (why they got this email, what to do). */
  footer?: ReactNode;
}) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Tailwind config={emailTailwind}>
        <Body className="bg-canvas font-sans text-ink">
          <Container className="mx-auto max-w-lg px-4 py-8">
            <Section className="rounded-t-2xl bg-plum px-8 py-6">
              <Text className="m-0 font-display text-2xl font-bold text-ink-inverse">NauriCare</Text>
            </Section>
            <Section className="rounded-b-2xl border border-solid border-hairline bg-surface px-8 py-8">
              {children}
            </Section>
            {footer}
            <Text className="mt-6 text-center text-xs text-ink-muted">NauriCare · {SITE_LOCATION}</Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
