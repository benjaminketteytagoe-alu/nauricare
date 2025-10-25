import { MessageSquare, Sparkles, Heart } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

export function HowItWorks() {
  const { t } = useLanguage();

  const steps = [
    {
      icon: MessageSquare,
      ...t.howItWorks.steps.step1,
      color: 'from-primary to-primary-glow',
    },
    {
      icon: Sparkles,
      ...t.howItWorks.steps.step2,
      color: 'from-secondary to-accent',
    },
    {
      icon: Heart,
      ...t.howItWorks.steps.step3,
      color: 'from-primary-glow to-secondary',
    },
  ];

  return (
    <section id="how-it-works" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            {t.howItWorks.title}
          </h2>
        </div>

        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 md:gap-4 relative">
            {/* Connection lines - hidden on mobile */}
            <div className="hidden md:block absolute top-24 left-0 right-0 h-1 bg-gradient-to-r from-primary via-secondary to-primary opacity-20" 
              style={{ top: '6rem', zIndex: 0 }} 
            />

            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div
                  key={index}
                  className="relative text-center animate-fade-in"
                  style={{ animationDelay: `${index * 200}ms` }}
                >
                  {/* Step number */}
                  <div className="inline-flex items-center justify-center mb-6 relative z-10">
                    <div className={`w-24 h-24 rounded-full bg-gradient-to-br ${step.color} p-1 shadow-lg`}>
                      <div className="w-full h-full rounded-full bg-card flex items-center justify-center">
                        <Icon className="w-10 h-10 text-primary" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="inline-block px-4 py-1 bg-primary/10 rounded-full text-sm font-semibold text-primary mb-2">
                      Step {index + 1}
                    </div>
                    <h3 className="text-xl font-bold">
                      {step.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
