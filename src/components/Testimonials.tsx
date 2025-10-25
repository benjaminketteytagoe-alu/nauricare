import { useLanguage } from '@/hooks/useLanguage';
import { Quote } from 'lucide-react';

export function Testimonials() {
  const { t } = useLanguage();

  const testimonials = [
    t.testimonials.items.test1,
    t.testimonials.items.test2,
    t.testimonials.items.test3,
  ];

  return (
    <section className="py-20 bg-gradient-to-b from-background to-primary-light/10">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            {t.testimonials.title}
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-card rounded-2xl p-8 shadow-lg border border-border hover:border-primary/50 transition-all duration-300 animate-fade-in"
              style={{ animationDelay: `${index * 150}ms` }}
            >
              <Quote className="h-10 w-10 text-primary mb-4 opacity-50" />
              <blockquote className="mb-6 text-foreground leading-relaxed italic">
                "{testimonial.quote}"
              </blockquote>
              <div className="border-t border-border pt-4">
                <p className="font-semibold">{testimonial.name}</p>
                <p className="text-sm text-muted-foreground">
                  {testimonial.location}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
