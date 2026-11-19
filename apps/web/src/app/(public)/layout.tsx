import type { Viewport } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

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
      <Footer />
    </div>
  );
}
