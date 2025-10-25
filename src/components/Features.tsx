import { useLanguage } from '@/hooks/useLanguage';
import featureAi from '@/assets/feature-ai.jpg';
import featureReferral from '@/assets/feature-referral.jpg';
import featureUssd from '@/assets/feature-ussd.jpg';
import featureTeleconsult from '@/assets/feature-teleconsult.jpg';
import featureEducation from '@/assets/feature-education.jpg';

const featureImages = {
  ai: featureAi,
  referral: featureReferral,
  ussd: featureUssd,
  teleconsult: featureTeleconsult,
  education: featureEducation,
};

export function Features() {
  const { t } = useLanguage();

  const features = [
    { key: 'ai', data: t.features.items.ai, image: featureImages.ai },
    { key: 'referral', data: t.features.items.referral, image: featureImages.referral },
    { key: 'ussd', data: t.features.items.ussd, image: featureImages.ussd },
    { key: 'teleconsult', data: t.features.items.teleconsult, image: featureImages.teleconsult },
    { key: 'education', data: t.features.items.education, image: featureImages.education },
  ];

  return (
    <section id="features" className="py-20 bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            {t.features.title}
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {features.map((feature, index) => (
            <div
              key={feature.key}
              className="group bg-card rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-border hover:border-primary/50 animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="mb-6 rounded-xl overflow-hidden bg-gradient-to-br from-primary/10 to-secondary/10 p-4">
                <img
                  src={feature.image}
                  alt={feature.data.title}
                  className="w-full h-48 object-cover rounded-lg"
                />
              </div>
              <h3 className="text-xl font-semibold mb-3 group-hover:text-primary transition-colors">
                {feature.data.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.data.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
