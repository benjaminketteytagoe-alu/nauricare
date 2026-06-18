import type { Viewport } from "next";
import Navbar from "@/components/Navbar";

// viewportFit "cover" scoped to public pages only — prevents admin/provider
// h-screen+overflow-hidden layouts from losing bottom content under the iOS home indicator.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen w-full">
      <Navbar />
      <main className="flex-grow">
        {children}
      </main>
      <footer className="bg-white border-t border-gray-200 py-8 text-center text-sm text-gray-500">
        <p>© {new Date().getFullYear()} NauriCare. Built for women in Africa.</p>
      </footer>
    </div>
  );
}
