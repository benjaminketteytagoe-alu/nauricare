import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/useLanguage';
import { Users, Heart, Building2, Award } from 'lucide-react';
import asyvLogo from '@/assets/partner-asyv.png';

export function Partners() {
  const { t } = useLanguage();

  const scrollToForm = () => {
    const form = document.getElementById('waitlist-form');
    if (form) {
      form.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="partners" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex justify-center gap-4 mb-8 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center">
              <Users className="w-8 h-8 text-primary-foreground" />
            </div>
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-secondary to-accent flex items-center justify-center">
              <Heart className="w-8 h-8 text-secondary-foreground" />
            </div>
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-glow to-secondary flex items-center justify-center">
              <Building2 className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>

          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 animate-fade-in">
            {t.partners.title}
          </h2>
          
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto animate-fade-in">
            {t.partners.description}
          </p>

          {/* Recognition & Partnerships */}
          <div className="mb-12 space-y-6 animate-fade-in">
            {/* AfyaFest Recognition */}
            <div className="flex items-center justify-center gap-3 text-primary">
              <Award className="w-6 h-6" />
              <span className="text-lg font-semibold">{t.partners.recognition}</span>
            </div>

            {/* ASYV Partnership */}
            <div className="flex flex-col items-center gap-4">
              <p className="text-muted-foreground font-medium">{t.partners.partnerships}</p>
              <div className="bg-background/80 backdrop-blur-sm rounded-lg p-6 shadow-lg max-w-xs">
                <img 
                  src={asyvLogo} 
                  alt="Agahozo Shalom Youth Village" 
                  className="w-full h-auto"
                />
              </div>
            </div>
          </div>

          <Button
            size="lg"
            className="text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all animate-fade-in"
            onClick={scrollToForm}
          >
            {t.partners.cta}
          </Button>
        </div>
      </div>
    </section>
  );
}
