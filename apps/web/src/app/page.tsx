import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Stethoscope, Phone, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="space-y-20 py-10 px-4 max-w-7xl mx-auto">
      {/* Hero Section */}
      <section className="text-center py-16 px-4 rounded-3xl bg-teal-900 text-white relative overflow-hidden shadow-xl">
        <div className="relative z-10 max-w-3xl mx-auto space-y-6">
          <Badge className="bg-teal-800 text-teal-100 hover:bg-teal-800 mb-4 px-4 py-1 text-sm border-none">
            Private & Secure
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            Your Companion for <span className="text-rose-400">Reproductive Health</span>
          </h1>
          <p className="text-lg md:text-xl text-teal-100 leading-relaxed max-w-2xl mx-auto">
            Guidance for PCOS, fibroids, and women's health. Track patterns, understand concerns, and connect securely with verified specialists.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
            <Button size="lg" className="bg-rose-500 hover:bg-rose-600 text-white border-none text-lg" asChild>
              <Link href="/symptoms">Start Free Symptom Check</Link>
            </Button>
            <Button size="lg" variant="outline" className="border-white text-teal-900 bg-white hover:bg-gray-100 text-lg" asChild>
              <Link href="/signup">Create Account</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* How it Works Grid */}
      <section className="grid md:grid-cols-3 gap-8">
        <Card className="border-none shadow-md">
          <CardContent className="pt-6 space-y-4">
            <div className="w-12 h-12 bg-teal-50 rounded-lg flex items-center justify-center">
              <Activity className="w-6 h-6 text-teal-600" />
            </div>
            <h3 className="font-bold text-xl text-gray-900">Smart Symptom Guide</h3>
            <p className="text-gray-600">
              Track patterns and understand possible signs of PCOS or fibroids in a private, secure environment.
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardContent className="pt-6 space-y-4">
            <div className="w-12 h-12 bg-rose-50 rounded-lg flex items-center justify-center">
              <Stethoscope className="w-6 h-6 text-rose-600" />
            </div>
            <h3 className="font-bold text-xl text-gray-900">Verified Specialists</h3>
            <p className="text-gray-600">
              Browse experienced gynecologists, review options, and book virtual or in-person appointments.
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardContent className="pt-6 space-y-4">
            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
              <Phone className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-bold text-xl text-gray-900">Accessible via USSD</h3>
            <p className="text-gray-600">
              No smartphone? Access essential health guidance and specialist referrals offline.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Trust & Safety */}
      <section className="bg-rose-50 rounded-2xl p-8 md:p-12 flex flex-col md:flex-row items-center gap-8 shadow-sm border border-rose-100">
        <div className="flex-1 space-y-4">
          <h2 className="text-3xl font-bold text-gray-900">Privacy First. Clinician Backed.</h2>
          <p className="text-gray-700 text-lg">
            NauriCare provides guidance, not diagnosis. Your health data is encrypted and strictly confidential. Our content is developed alongside qualified medical professionals.
          </p>
          <div className="flex items-center gap-2 font-medium text-rose-800">
            <ShieldCheck className="w-5 h-5" />
            <span>Aligned with clinical guidelines</span>
          </div>
        </div>
      </section>
    </div>
  );
}
