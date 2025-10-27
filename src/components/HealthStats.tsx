import { useLanguage } from '@/hooks/useLanguage';
import { AlertCircle, CheckCircle2, TrendingUp } from 'lucide-react';

export function HealthStats() {
  const { t } = useLanguage();

  const stats = [
    { ...t.healthStats.stats.pcos, icon: AlertCircle, color: 'text-red-500' },
    { ...t.healthStats.stats.fibroids, icon: AlertCircle, color: 'text-orange-500' },
    { ...t.healthStats.stats.undiagnosed, icon: TrendingUp, color: 'text-yellow-500' },
    { ...t.healthStats.stats.treatment, icon: TrendingUp, color: 'text-purple-500' },
  ];

  return (
    <section className="py-20 bg-gradient-to-b from-background via-accent/5 to-background">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16 animate-fade-in max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">
            {t.healthStats.title}
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
            {t.healthStats.subtitle}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16 max-w-7xl mx-auto">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className="bg-card rounded-2xl p-6 shadow-lg border border-border hover:border-primary/50 transition-all duration-300 animate-fade-in hover:scale-105"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <Icon className={`h-10 w-10 ${stat.color} mb-4`} />
                <div className="text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  {stat.number}
                </div>
                <div className="text-lg font-semibold mb-3 text-foreground">
                  {stat.label}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {stat.fact}
                </p>
              </div>
            );
          })}
        </div>

        {/* Why NauriCare Section */}
        <div className="max-w-5xl mx-auto bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 rounded-3xl p-8 md:p-12 shadow-xl border border-primary/20 animate-fade-in">
          <h3 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-8 text-center">
            {t.healthStats.whyNauricare.title}
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            {t.healthStats.whyNauricare.reasons.map((reason, index) => (
              <div
                key={index}
                className="flex gap-4 items-start animate-fade-in"
                style={{ animationDelay: `${(index + 4) * 100}ms` }}
              >
                <CheckCircle2 className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                <p className="text-foreground leading-relaxed">{reason}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
