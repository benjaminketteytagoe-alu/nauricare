import { describe, expect, it } from "vitest";
import { generateGoogleCalendarUrl, generateIcsFile } from "./calendar";

const appt = {
  id: "a1",
  startTime: "2026-06-15T09:00:00.000Z",
  endTime: "2026-06-15T10:00:00.000Z",
  meetingLink: "https://meet.jit.si/nauricare-a1",
};

describe("calendar exports", () => {
  it("builds a Google Calendar template link in UTC", () => {
    const url = new URL(generateGoogleCalendarUrl(appt));
    expect(url.searchParams.get("dates")).toBe("20260615T090000Z/20260615T100000Z");
    expect(url.searchParams.get("location")).toBe(appt.meetingLink);
  });

  it("writes an RFC 5545 event with CRLF line endings", () => {
    const ics = generateIcsFile({ ...appt, meetingLink: null }, "Check-in");
    expect(ics.split("\r\n")).toEqual(
      expect.arrayContaining(["BEGIN:VCALENDAR", "DTSTART:20260615T090000Z", "SUMMARY:Check-in", "LOCATION:"]),
    );
    expect(ics).not.toMatch(/[^\r]\n/);
  });
});
