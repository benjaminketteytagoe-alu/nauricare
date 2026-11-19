export type AppointmentForCalendar = {
  id: string;
  startTime: string; // ISO string — must be serialized before passing from Server to Client Components
  endTime: string;
  meetingLink?: string | null;
};

// Formats a Date to the compact UTC string required by iCalendar and Google Calendar.
// e.g. 2026-06-15T09:00:00.000Z → "20260615T090000Z"
function toCalendarDate(iso: string): string {
  return iso.replace(/[-:]/g, "").split(".")[0] + "Z";
}

export function generateGoogleCalendarUrl(appt: AppointmentForCalendar, title = "NauriCare Telehealth Consultation"): string {
  const link = appt.meetingLink ?? "";
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${toCalendarDate(appt.startTime)}/${toCalendarDate(appt.endTime)}`,
    details: `Join your NauriCare secure telehealth consultation.\n\nMeeting link: ${link}`,
    location: link,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function generateIcsFile(appt: AppointmentForCalendar, title = "NauriCare Telehealth Consultation"): string {
  const link = appt.meetingLink ?? "";
  const now = toCalendarDate(new Date().toISOString());

  // RFC 5545 requires CRLF line endings.
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//NauriCare//Telehealth//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:nauricare-${appt.id}@nauricare.health`,
    `DTSTAMP:${now}`,
    `DTSTART:${toCalendarDate(appt.startTime)}`,
    `DTEND:${toCalendarDate(appt.endTime)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:Join your secure NauriCare telehealth consultation.\\nMeeting link: ${link}`,
    `LOCATION:${link}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return lines.join("\r\n");
}
