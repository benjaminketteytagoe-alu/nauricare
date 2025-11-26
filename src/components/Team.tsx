import { useLanguage } from '@/hooks/useLanguage';
import { Card, CardContent } from '@/components/ui/card';
import { Linkedin } from 'lucide-react';

const teamMembers = [
  {
    name: 'Benjamin Kettey-Tagoe',
    role: {
      en: 'Co-founder/CEO',
      rw: 'Umushinzwe hamwe',
    },
    image: 'https://ibb.co/GQv6rDxR',
    linkedin: 'https://www.linkedin.com/in/benjamin-kettey-tagoe/',
  },
  {
    name: 'Ondiro Oganga',
    role: {
      en: 'Co-founder',
      rw: 'Umushinzwe hamwe',
    },
    image: 'https://ibb.co/d4C0bW5H',
    linkedin: 'https://www.linkedin.com/in/ondiro-oganga-9a3695b2/',
  },
  {
    name: "Dr. Achieng Align'",
    role: {
      en: 'Gynecologist / Advisor',
      rw: 'Muganga w\'ababyeyi / Umujyanama',
    },
    image: 'https://ibb.co/p6W9Rj91',
    linkedin: 'https://www.linkedin.com/in/achieng-aling/',
  },
];

export function Team() {
  const { language, t } = useLanguage();

  return (
    <section className="py-20 bg-gradient-to-b from-white to-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {language === 'en' ? 'Meet Our Team' : 'Itsinda Ryacu'}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {language === 'en'
              ? 'Passionate professionals dedicated to transforming healthcare in Rwanda'
              : 'Abahanga bifuza guhindura ubuzima bw\'ubuvuzi mu Rwanda'}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {teamMembers.map((member) => (
            <Card
              key={member.name}
              className="overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2"
            >
              <div className="aspect-square overflow-hidden bg-muted">
                <img
                  src={member.image}
                  alt={member.name}
                  className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                />
              </div>
              <CardContent className="p-6 text-center">
                <h3 className="text-xl font-semibold mb-2">{member.name}</h3>
                <p className="text-muted-foreground mb-4">
                  {member.role[language]}
                </p>
                {member.linkedin && (
                  <a
                    href={member.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 hover:bg-primary hover:text-white transition-colors duration-300"
                    aria-label={`${member.name} LinkedIn profile`}
                  >
                    <Linkedin className="w-5 h-5" />
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
