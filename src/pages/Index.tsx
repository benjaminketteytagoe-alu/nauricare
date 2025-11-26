/*
 * ===============================================
 * NAURICARE LANDING PAGE - CUSTOMIZATION GUIDE
 * ===============================================
 * 
 * QUICK START:
 * 1. Colors & Design: Edit src/index.css (design tokens) and tailwind.config.ts
 * 2. Content & Translations: Edit src/types/translations.ts
 * 3. Images: Replace images in src/assets/ folder
 * 4. Form API: Update API endpoint in src/components/WaitlistForm.tsx (line ~54)
 * 5. Analytics: Add your analytics code in this file (useEffect below, line ~30)
 * 
 * DESIGN CUSTOMIZATION:
 * - Primary color (soft pink): Edit --primary in src/index.css
 * - Secondary color (lavender): Edit --secondary in src/index.css
 * - All colors use HSL format for easy tweaking
 * - Animations defined in tailwind.config.ts
 * 
 * CONTENT CUSTOMIZATION:
 * - All text content is in src/types/translations.ts
 * - Supports English (en), Swahili (sw), Kinyarwanda (rw)
 * - Add more languages by extending the translations object
 * 
 * FORM INTEGRATION:
 * - Form submission in src/components/WaitlistForm.tsx
 * - Look for "TODO: Replace with actual API endpoint" comment
 * - Update fetch URL to your backend (e.g., '/api/waitlist')
 * 
 * ANALYTICS INTEGRATION:
 * - Google Analytics / Tag Manager: Add script in index.html
 * - dataLayer events are already set up (see below)
 * - Events tracked: page_view, waitlist_signup, language_change
 * 
 * A/B TESTING:
 * - CTA variant test is in src/components/Hero.tsx
 * - Variants stored in localStorage
 * - Modify ctaText logic to change variants
 * 
 * COMPONENTS:
 * - Navigation: src/components/Navigation.tsx
 * - Hero: src/components/Hero.tsx
 * - Features: src/components/Features.tsx
 * - How It Works: src/components/HowItWorks.tsx
 * - Testimonials: src/components/Testimonials.tsx
 * - Partners CTA: src/components/Partners.tsx
 * - Waitlist Form: src/components/WaitlistForm.tsx
 * - Footer: src/components/Footer.tsx
 * 
 * ===============================================
 */

import { useEffect } from 'react';
import { LanguageProvider } from '@/hooks/useLanguage';
import { Navigation } from '@/components/Navigation';
import { Hero } from '@/components/Hero';
import { HealthStats } from '@/components/HealthStats';
import { WaitlistForm } from '@/components/WaitlistForm';
import { Features } from '@/components/Features';
import { HowItWorks } from '@/components/HowItWorks';
import { Testimonials } from '@/components/Testimonials';
import { Team } from '@/components/Team';
import { Partners } from '@/components/Partners';
import { Footer } from '@/components/Footer';

const Index = () => {
  useEffect(() => {
    // Initialize dataLayer for analytics placeholder
    if (typeof window !== 'undefined') {
      (window as any).dataLayer = (window as any).dataLayer || [];
      (window as any).dataLayer.push({
        event: 'page_view',
        page_title: 'NauriCare Landing Page',
        page_location: window.location.href,
      });
    }
  }, []);

  return (
    <LanguageProvider>
      <div className="min-h-screen">
        <Navigation />
        <main>
          <Hero />
          <HealthStats />
          <Features />
          <HowItWorks />
          <Testimonials />
          <Team />
          <Partners />
          <WaitlistForm />
        </main>
        <Footer />
      </div>
    </LanguageProvider>
  );
};

export default Index;
