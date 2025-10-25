import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useLanguage } from '@/hooks/useLanguage';
import { CheckCircle2, Loader2 } from 'lucide-react';

const formSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name too long"),
  emailOrPhone: z.string().trim().min(1, "Email or phone is required").max(255),
  country: z.string().min(1, "Country is required"),
  language: z.string().min(1, "Language is required"),
  role: z.enum(['user', 'provider', 'partner']),
});

type FormData = z.infer<typeof formSchema>;

export function WaitlistForm() {
  const { t, language } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      role: 'user',
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);

    // Analytics placeholder
    if (typeof window !== 'undefined' && (window as any).dataLayer) {
      (window as any).dataLayer.push({
        event: 'waitlist_signup',
        role: data.role,
        country: data.country,
        language: data.language,
        interface_language: language,
      });
    }

    try {
      // TODO: Replace with actual API endpoint
      // const response = await fetch('/api/waitlist', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(data),
      // });
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setShowSuccess(true);
      reset();
    } catch (error) {
      console.error('Form submission error:', error);
      alert('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <section id="waitlist-form" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <div className="bg-card rounded-2xl shadow-lg p-8 md:p-12 border border-border">
              <div className="text-center mb-8">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  {t.hero.ctaPrimary}
                </h2>
                <p className="text-muted-foreground">
                  {t.hero.subheadline}
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">{t.form.name}</Label>
                  <Input
                    id="name"
                    {...register('name')}
                    className={errors.name ? 'border-destructive' : ''}
                    aria-invalid={!!errors.name}
                    aria-describedby={errors.name ? 'name-error' : undefined}
                  />
                  {errors.name && (
                    <p id="name-error" className="text-sm text-destructive">
                      {errors.name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emailOrPhone">{t.form.emailOrPhone}</Label>
                  <Input
                    id="emailOrPhone"
                    {...register('emailOrPhone')}
                    placeholder="email@example.com or +254..."
                    className={errors.emailOrPhone ? 'border-destructive' : ''}
                    aria-invalid={!!errors.emailOrPhone}
                  />
                  {errors.emailOrPhone && (
                    <p className="text-sm text-destructive">
                      {errors.emailOrPhone.message}
                    </p>
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="country">{t.form.country}</Label>
                    <Input
                      id="country"
                      {...register('country')}
                      placeholder="Kenya"
                      className={errors.country ? 'border-destructive' : ''}
                    />
                    {errors.country && (
                      <p className="text-sm text-destructive">
                        {errors.country.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="language">{t.form.language}</Label>
                    <Input
                      id="language"
                      {...register('language')}
                      placeholder="English, Swahili..."
                      className={errors.language ? 'border-destructive' : ''}
                    />
                    {errors.language && (
                      <p className="text-sm text-destructive">
                        {errors.language.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">{t.form.role}</Label>
                  <Select
                    value={watch('role')}
                    onValueChange={(value) => setValue('role', value as any)}
                  >
                    <SelectTrigger id="role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">
                        {t.form.roleOptions.user}
                      </SelectItem>
                      <SelectItem value="provider">
                        {t.form.roleOptions.provider}
                      </SelectItem>
                      <SelectItem value="partner">
                        {t.form.roleOptions.partner}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full text-lg py-6"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    t.form.submit
                  )}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </section>

      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-4">
              <CheckCircle2 className="h-16 w-16 text-primary" />
            </div>
            <DialogTitle className="text-center text-2xl">
              {t.form.successTitle}
            </DialogTitle>
            <DialogDescription className="text-center text-base">
              {t.form.successMessage}
            </DialogDescription>
          </DialogHeader>
          <Button onClick={() => setShowSuccess(false)} className="w-full">
            Close
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
