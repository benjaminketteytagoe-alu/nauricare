import { useState } from 'react';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Download, Search } from 'lucide-react';

interface Signup {
  id: string;
  name: string;
  email_or_phone: string;
  country: string;
  language: string;
  role: string;
  created_at: string;
}

interface SignupsTableProps {
  signups: Signup[];
}

export function SignupsTable({ signups }: SignupsTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  const filteredSignups = signups.filter((signup) => {
    const matchesSearch =
      signup.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      signup.email_or_phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      signup.country.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === 'all' || signup.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const exportToCSV = () => {
    const headers = ['Name', 'Email/Phone', 'Country', 'Language', 'Role', 'Joined Date'];
    const rows = filteredSignups.map((signup) => [
      signup.name,
      signup.email_or_phone,
      signup.country,
      signup.language,
      signup.role,
      format(new Date(signup.created_at), 'yyyy-MM-dd HH:mm:ss'),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `waitlist-signups-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'user':
        return 'default';
      case 'provider':
        return 'secondary';
      case 'partner':
        return 'outline';
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email/phone, or country..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="user">Users</SelectItem>
              <SelectItem value="provider">Providers</SelectItem>
              <SelectItem value="partner">Partners</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportToCSV} variant="outline" className="whitespace-nowrap">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email/Phone</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Language</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSignups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No signups found
                </TableCell>
              </TableRow>
            ) : (
              filteredSignups.map((signup) => (
                <TableRow key={signup.id}>
                  <TableCell className="font-medium">{signup.name}</TableCell>
                  <TableCell>{signup.email_or_phone}</TableCell>
                  <TableCell>{signup.country}</TableCell>
                  <TableCell>{signup.language}</TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(signup.role)}>
                      {signup.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {format(new Date(signup.created_at), 'MMM dd, yyyy HH:mm')}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
