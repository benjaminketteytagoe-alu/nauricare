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
    // pt-safe-top is a no-op outside notched devices (env() resolves to 0),
    // and only pushes content down when viewport-fit=cover + a real inset apply.
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50 pt-safe-top">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center h-11 shrink-0">
          <Image
            src="/logo-horizontal.jpg"
            alt="NauriCare Logo"
            width={150}
            height={40}
            className="h-8 w-auto"
          />
        </Link>

        <div className="flex items-center gap-2 sm:gap-4">
          {/* h-11 (44px) overrides the Button default h-9 to meet the minimum touch target */}
          <Button variant="ghost" className="h-11 px-3 sm:px-4" asChild>
            <Link href="/login">Log in</Link>
          </Button>
          <Button className="h-11 px-4 sm:px-6 bg-teal-600 hover:bg-teal-700" asChild>
            <Link href="/signup">Get Started</Link>
          </Button>
        </div>
      </div>
    </nav>
  );
}
