import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LanguageToggle } from './LanguageToggle';
import { useLanguage } from '@/hooks/useLanguage';
import logo from '@/assets/logo.png';

export function Navigation() {
  const { t } = useLanguage();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-background/95 backdrop-blur-md shadow-md'
          : 'bg-transparent'
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center hover:opacity-80 transition-opacity"
          >
            <img src={logo} alt="NauriCare" className="h-8 md:h-10" />
          </button>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <button
              onClick={() => scrollToSection('features')}
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              {t.hero.ctaSecondary}
            </button>
            <button
              onClick={() => scrollToSection('partners')}
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              {t.hero.ctaTertiary}
            </button>
            <LanguageToggle />
            <Button
              onClick={() => scrollToSection('waitlist-form')}
              size="sm"
            >
              {t.hero.ctaPrimary}
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <LanguageToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border bg-background/95 backdrop-blur-md">
            <div className="flex flex-col gap-4">
              <button
                onClick={() => scrollToSection('features')}
                className="text-left px-4 py-2 hover:bg-primary/10 rounded-lg transition-colors"
              >
                Features
              </button>
              <button
                onClick={() => scrollToSection('how-it-works')}
                className="text-left px-4 py-2 hover:bg-primary/10 rounded-lg transition-colors"
              >
                {t.hero.ctaSecondary}
              </button>
              <button
                onClick={() => scrollToSection('partners')}
                className="text-left px-4 py-2 hover:bg-primary/10 rounded-lg transition-colors"
              >
                {t.hero.ctaTertiary}
              </button>
              <Button
                onClick={() => scrollToSection('waitlist-form')}
                className="mx-4"
              >
                {t.hero.ctaPrimary}
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
