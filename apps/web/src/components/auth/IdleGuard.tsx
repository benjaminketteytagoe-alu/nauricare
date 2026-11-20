"use client";

import { signOut, useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ACTIVITY_REPORT_MS, IDLE_WARNING_MS } from "@/lib/sessionPolicy";

// Signs the person out after the inactivity limit from lib/sessionPolicy,
// with a "still there?" warning first. Activity in any tab counts for all
// tabs (shared through localStorage). The server enforces the same limit on
// its own, so closing the tab or sleeping the laptop doesn't keep a session
// alive; this guard makes it visible and reports real activity to the server.

const STORAGE_KEY = "nc:last-activity";
const EVENTS = ["pointerdown", "keydown", "wheel", "touchstart", "scroll"] as const;

function readShared(): number {
  try {
    return Number(localStorage.getItem(STORAGE_KEY)) || 0;
  } catch {
    return 0;
  }
}

function writeShared(t: number) {
  try {
    localStorage.setItem(STORAGE_KEY, String(t));
  } catch {
    /* private mode: this tab still tracks its own activity */
  }
}

export function IdleGuard() {
  const { data: session, update } = useSession();
  const limit = session?.idleLimitMs ?? null;
  const lastActivity = useRef(0); // set when the guard starts
  const lastReport = useRef(0);
  const warning = useRef(false);
  const [remaining, setRemaining] = useState<number | null>(null);

  const end = useCallback((reason: string = "idle") => {
    void signOut({ callbackUrl: `/login?ended=${reason}` });
  }, []);

  // The server ended the session (inactivity, lifetime, password change).
  const ended = session?.ended;
  useEffect(() => {
    if (ended) end(ended);
  }, [ended, end]);

  const markActive = useCallback(() => {
    const now = Date.now();
    lastActivity.current = now;
    writeShared(now);
    if (now - lastReport.current >= ACTIVITY_REPORT_MS) {
      lastReport.current = now;
      void update({ activity: true });
    }
  }, [update]);

  useEffect(() => {
    if (limit === null) return;
    if (!lastActivity.current) lastActivity.current = lastReport.current = Date.now();
    const onActivity = () => {
      // While the warning is open only its buttons count, so a stray scroll
      // can't silently dismiss it.
      if (!warning.current) markActive();
    };
    const tick = () => {
      const last = Math.max(lastActivity.current, readShared());
      const left = limit - (Date.now() - last);
      warning.current = left <= IDLE_WARNING_MS;
      if (left <= 0) end();
      else setRemaining(warning.current ? left : null);
    };
    const onVisible = () => document.visibilityState === "visible" && tick();
    EVENTS.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("storage", tick); // another tab was active
    const id = window.setInterval(tick, 1000);
    tick();
    return () => {
      EVENTS.forEach((e) => window.removeEventListener(e, onActivity));
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("storage", tick);
      window.clearInterval(id);
    };
  }, [limit, markActive, end]);

  const stay = () => {
    warning.current = false;
    lastReport.current = 0; // report straight away
    markActive();
    setRemaining(null);
  };

  if (limit === null || remaining === null) return null;
  const seconds = Math.ceil(remaining / 1000);
  const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          stay();
        }
      }}
    >
      <DialogContent showClose={false} role="alertdialog">
        <DialogHeader>
          <DialogTitle>Are you still there?</DialogTitle>
          <DialogDescription>
            To keep your health information private, you&apos;ll be signed out in{" "}
            <strong className="font-semibold tabular-nums text-ink" aria-live="off">
              {clock}
            </strong>
            .
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => end()}>
            Sign out now
          </Button>
          <Button autoFocus onClick={stay}>
            Stay signed in
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
