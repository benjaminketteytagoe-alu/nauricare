import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { AdminStats } from '@/components/AdminStats';
import { SignupsTable } from '@/components/SignupsTable';
import { Loader2, LogOut, RefreshCw } from 'lucide-react';

interface Signup {
  id: string;
  name: string;
  email_or_phone: string;
  country: string;
  language: string;
  role: string;
  created_at: string;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [signups, setSignups] = useState<Signup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadSignups = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        navigate('/admin/login');
        return;
      }

      const { data: adminData } = await supabase
        .from('admin_users')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (!adminData) {
        await supabase.auth.signOut();
        navigate('/admin/login');
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('waitlist_signups')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setSignups(data || []);
    } catch (err) {
      console.error('Error loading signups:', err);
      setError(err instanceof Error ? err.message : 'Failed to load signups');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadSignups();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadSignups();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin/login');
  };

  const totalSignups = signups.length;
  const userCount = signups.filter((s) => s.role === 'user').length;
  const providerCount = signups.filter((s) => s.role === 'provider').length;
  const partnerCount = signups.filter((s) => s.role === 'partner').length;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-card border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground">Waitlist Management</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {error && (
            <div className="bg-destructive/10 text-destructive p-4 rounded-md">
              {error}
            </div>
          )}

          <AdminStats
            totalSignups={totalSignups}
            userCount={userCount}
            providerCount={providerCount}
            partnerCount={partnerCount}
          />

          <div className="bg-card rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4">All Signups</h2>
            <SignupsTable signups={signups} />
          </div>
        </div>
      </main>
    </div>
  );
}
