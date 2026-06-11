"use client";

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function Navbar() {
  const pathname = usePathname();

  // Hide the public navbar inside the private application workspaces
  if (
    pathname?.startsWith("/admin") || 
    pathname?.startsWith("/provider") || 
    pathname?.startsWith("/dashboard")
  ) {
    return null;
  }

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/">
          <Image 
            src="/logo-horizontal.jpg" 
            alt="NauriCare Logo" 
            width={150} 
            height={40} 
            className="h-8 w-auto"
          />
        </Link>
        
        <div className="flex items-center gap-4">
          <Button variant="ghost" asChild><Link href="/login">Log in</Link></Button>
          <Button className="bg-teal-600 hover:bg-teal-700" asChild>
            <Link href="/signup">Get Started</Link>
          </Button>
        </div>
      </div>
    </nav>
  );
}
