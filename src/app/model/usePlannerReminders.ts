import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

import type { PlannerMeta } from "@/features/planner-storage/model/types";
import {
  getReminderPermission,
  requestReminderPermission,
  runReminderCheck,
  syncRemindersToServiceWorker,
  type ReminderSettings,
} from "@/features/reminders/model/reminders";

export function usePlannerReminders({
  ready,
  setState,
  state,
}: {
  ready: boolean;
  setState: Dispatch<SetStateAction<PlannerMeta>>;
  state: PlannerMeta;
}) {
  const [reminderPermission, setReminderPermission] = useState(getReminderPermission);

  useEffect(() => {
    if (!ready) return;
    setState((current) => runReminderCheck(current));
  }, [ready, setState]);

  useEffect(() => {
    if (!ready || !state.reminders.enabled) return;

    const tick = () => setState((current) => runReminderCheck(current));
    tick();
    const intervalId = window.setInterval(tick, 30 * 60 * 1000);
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [ready, setState, state.reminders.enabled]);

  useEffect(() => {
    if (!ready) return;
    void syncRemindersToServiceWorker(state);
  }, [ready, state]);

  function updateReminders(update: Partial<ReminderSettings>) {
    void (async () => {
      if (update.enabled && getReminderPermission() !== "granted") {
        const permission = await requestReminderPermission();
        setReminderPermission(permission);
        if (permission !== "granted") return;
      }
      setState((current) => ({
        ...current,
        reminders: { ...current.reminders, ...update },
      }));
    })();
  }

  return { reminderPermission, updateReminders };
}
