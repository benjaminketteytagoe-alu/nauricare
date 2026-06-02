"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Calendar, User, LogOut } from "lucide-react";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Protect the route: if not logged in, redirect to login
  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  // Show a loading state while checking the session
  if (status === "loading") {
    return (
      <div className="min-h-[90vh] flex items-center justify-center bg-gray-50">
        <div className="text-teal-600 font-medium animate-pulse">Loading your dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-3xl font-bold text-teal-900">Patient Dashboard</h1>
            <p className="text-gray-500 mt-1">
              Welcome back, <span className="font-semibold text-teal-700">{session?.user?.name || "User"}</span>!
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => signOut({ callbackUrl: "/login" })} 
            className="flex items-center gap-2 border-gray-300 text-gray-600 hover:bg-gray-100"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </Button>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Symptom Logs</CardTitle>
              <Activity className="w-4 h-4 text-teal-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-teal-900">0</div>
              <p className="text-xs text-gray-500 mt-1">No logs this week</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Upcoming Appointments</CardTitle>
              <Calendar className="w-4 h-4 text-rose-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-teal-900">None</div>
              <p className="text-xs text-gray-500 mt-1">Book a specialist</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Account Role</CardTitle>
              <User className="w-4 h-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-teal-900 capitalize">
                {session?.user?.role?.toLowerCase() || "Patient"}
              </div>
              <p className="text-xs text-gray-500 mt-1">Standard access</p>
            </CardContent>
          </Card>
        </div>
        
        {/* Phase 2 Placeholder */}
        <div className="bg-white p-10 rounded-xl shadow-sm border border-teal-100 text-center space-y-5 mt-8">
          <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mx-auto">
            <Activity className="w-8 h-8 text-teal-600" />
          </div>
          <h3 className="text-2xl font-semibold text-teal-900">Ready to track your health?</h3>
          <p className="text-gray-500 max-w-lg mx-auto leading-relaxed">
            In our next phase, this is where you will log your daily symptoms, track patterns for PCOS or fibroids, and view your personalized health insights.
          </p>
          <Button className="bg-teal-600 hover:bg-teal-700 text-white h-11 px-8 mt-4">
            Start Symptom Log (Coming Soon)
          </Button>
        </div>

      </div>
    </div>
  );
}
