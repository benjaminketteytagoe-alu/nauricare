import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

 
// A perfect day = 4 completions (100%).
const TOTAL_DAILY_HABITS = 4;

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "PATIENT") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const profile = await prisma.patientProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!profile) {
      return new NextResponse("Profile not found", { status: 404 });
    }

    // 1. Fetch all completed logs for the current year
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);

    const logs = await prisma.habitLog.findMany({
      where: {
        patientProfileId: profile.id,
        date: { gte: startOfYear },
        completed: true,
      },
    });

    // 2. Initialize the exact data structures  frontend expects
    const weekData = [
      { label: 'Sun', value: 0 }, { label: 'Mon', value: 0 }, { label: 'Tue', value: 0 },
      { label: 'Wed', value: 0 }, { label: 'Thu', value: 0 }, { label: 'Fri', value: 0 }, { label: 'Sat', value: 0 }
    ];
    const monthData = [
      { label: 'Week 1', value: 0 }, { label: 'Week 2', value: 0 },
      { label: 'Week 3', value: 0 }, { label: 'Week 4', value: 0 }
    ];
    const yearData = [
      { label: 'Jan', value: 0 }, { label: 'Feb', value: 0 }, { label: 'Mar', value: 0 },
      { label: 'Apr', value: 0 }, { label: 'May', value: 0 }, { label: 'Jun', value: 0 },
      { label: 'Jul', value: 0 }, { label: 'Aug', value: 0 }, { label: 'Sep', value: 0 },
      { label: 'Oct', value: 0 }, { label: 'Nov', value: 0 }, { label: 'Dec', value: 0 }
    ];

    // 3. Process the logs into their respective buckets
    const today = new Date();
    const currentMonth = today.getMonth();
    
    // Calculate the start of the current week (Sunday)
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    logs.forEach(log => {
      const logDate = new Date(log.date);

      // Add to Yearly bucket
      yearData[logDate.getMonth()].value += 1;

      // Add to Monthly bucket (If it occurred this month)
      if (logDate.getMonth() === currentMonth && logDate.getFullYear() === currentYear) {
        const dateNumber = logDate.getDate();
        const weekIndex = Math.min(Math.floor((dateNumber - 1) / 7), 3); // Groups into 4 weeks
        monthData[weekIndex].value += 1;
      }

      // Add to Weekly bucket (If it occurred this week)
      if (logDate >= startOfWeek) {
        weekData[logDate.getDay()].value += 1;
      }
    });

    // 4. Convert raw counts into percentages
    const calculatePercentage = (count: number, maxPossible: number) => 
      Math.min(Math.round((count / maxPossible) * 100), 100);

    // Format Week: Monday first, Sunday last (matching your UI)
    const formattedWeekData = weekData.map(d => ({ ...d, value: calculatePercentage(d.value, TOTAL_DAILY_HABITS) }));
    const shiftedWeek = [...formattedWeekData.slice(1), formattedWeekData[0]];

    // Format Month: ~28 habits max per week
    const formattedMonthData = monthData.map(d => ({ ...d, value: calculatePercentage(d.value, TOTAL_DAILY_HABITS * 7) }));

    // Format Year: ~120 habits max per month
    const formattedYearData = yearData.map(d => ({ ...d, value: calculatePercentage(d.value, TOTAL_DAILY_HABITS * 30) }));

    return NextResponse.json({
      week: shiftedWeek,
      month: formattedMonthData,
      year: formattedYearData
    });

  } catch (error) {
    console.error("[ANALYTICS_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
