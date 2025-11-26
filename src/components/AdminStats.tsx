import { Users, UserCheck, Building2, Globe } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface StatsProps {
  totalSignups: number;
  userCount: number;
  providerCount: number;
  partnerCount: number;
}

export function AdminStats({ totalSignups, userCount, providerCount, partnerCount }: StatsProps) {
  const stats = [
    {
      title: 'Total Signups',
      value: totalSignups,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Users',
      value: userCount,
      icon: UserCheck,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Healthcare Providers',
      value: providerCount,
      icon: Building2,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
    {
      title: 'Partners',
      value: partnerCount,
      icon: Globe,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <div className={`${stat.bgColor} p-2 rounded-full`}>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
