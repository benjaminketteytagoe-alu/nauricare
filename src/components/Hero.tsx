import { useState, useEffect } from 'react';
import { ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/useLanguage';
import { WaitlistForm } from './WaitlistForm';
import heroImage from '@/assets/hero-image.jpg';

export function Hero() {
  const { t } = useLanguage();
  const [ctaVariant, setCtaVariant] = useState<'A' | 'B'>('A');

  // A/B test hook - switch CTA text
  useEffect(() => {
    const variant = localStorage.getItem('nauricare-cta-variant');
    if (!variant) {
      const randomVariant = Math.random() > 0.5 ? 'B' : 'A';
      localStorage.setItem('nauricare-cta-variant', randomVariant);
      setCtaVariant(randomVariant);
    } else {
      setCtaVariant(variant as 'A' | 'B');
    }
  }, []);

  const ctaText = ctaVariant === 'A' ? t.hero.ctaPrimary : 'Get Early Access';

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-background via-primary-light/10 to-secondary-light/20">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle, hsl(var(--primary)) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />
      </div>

      <div className="container mx-auto px-4 py-20 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center max-w-7xl mx-auto">
          {/* Content */}
          <div className="text-center lg:text-left space-y-8 animate-fade-in">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
              {t.hero.headline}
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto lg:mx-0">
              {t.hero.subheadline}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button
                size="lg"
                className="text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all"
                onClick={() => scrollToSection('waitlist-form')}
              >
                {ctaText}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-8 py-6"
                onClick={() => scrollToSection('how-it-works')}
              >
                {t.hero.ctaSecondary}
              </Button>
            </div>

            <button
              onClick={() => scrollToSection('features')}
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Scroll to features"
            >
              <span className="text-sm">{t.hero.ctaSecondary}</span>
              <ArrowDown className="h-4 w-4 animate-bounce" />
            </button>
          </div>

          {/* Image */}
          <div className="relative animate-fade-in">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl">
              <img
                src={heroImage}
                alt="African woman using NauriCare mobile health app"
                className="w-full h-auto"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent" />
            </div>
            {/* Floating element */}
            <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-secondary rounded-full blur-3xl opacity-50 animate-float" />
            <div className="absolute -top-4 -left-4 w-24 h-24 bg-primary rounded-full blur-2xl opacity-40 animate-float" style={{ animationDelay: '1s' }} />
          </div>
        </div>
      </div>
    </section>
  );
}
