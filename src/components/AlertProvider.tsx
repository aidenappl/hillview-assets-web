"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import Notice, { type NoticeState } from "@/components/Notice";

type Alert = NoticeState & { id: number };

type AlertApi = {
  /** Shows a toast. Alerts with an action stay until used or dismissed. */
  show: (
    tone: NoticeState["tone"],
    text: string,
    action?: NoticeState["action"],
  ) => void;
  /** Clears every toast (e.g. when the kiosk moves to another step). */
  clear: () => void;
};

const AlertContext = createContext<AlertApi | null>(null);

const LIFETIME_MS = { success: 3000, warn: 6000, error: 6000 } as const;
const MAX_VISIBLE = 3;

/**
 * App-wide alerts, replacing window.alert/confirm: a non-blocking toast stack
 * at the top of the screen, so a student isn't stopped by a browser dialog
 * mid-scan and a scanner gun's Enter can't dismiss something unread.
 */
export default function AlertProvider({ children }: { children: ReactNode }) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback(
    (id: number) => setAlerts((a) => a.filter((x) => x.id !== id)),
    [],
  );

  const show = useCallback<AlertApi["show"]>(
    (tone, text, action) => {
      const id = ++nextId.current;
      setAlerts((a) =>
        [...a.filter((x) => x.text !== text), { id, tone, text, action }].slice(
          -MAX_VISIBLE,
        ),
      );
      if (!action) setTimeout(() => dismiss(id), LIFETIME_MS[tone]);
    },
    [dismiss],
  );

  const clear = useCallback(() => setAlerts([]), []);
  const api = useMemo(() => ({ show, clear }), [show, clear]);

  return (
    <AlertContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2"
        aria-live="polite"
      >
        {alerts.map((a) => (
          <Notice
            key={a.id}
            notice={{
              ...a,
              action: a.action && {
                label: a.action.label,
                run: () => {
                  dismiss(a.id);
                  a.action?.run();
                },
              },
            }}
            onDismiss={() => dismiss(a.id)}
          />
        ))}
      </div>
    </AlertContext.Provider>
  );
}

export const useAlert = (): AlertApi => {
  const ctx = useContext(AlertContext);
  if (!ctx) throw new Error("useAlert must be used inside <AlertProvider>");
  return ctx;
};
