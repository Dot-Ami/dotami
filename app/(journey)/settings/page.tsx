import { SettingsPage } from "@/components/settings/settings-page";
import { logRouteError } from "@/lib/api/log-error";
import { prisma } from "@/lib/prisma";
import { readSetting } from "@/lib/settings/store";
import { readSettingsToday } from "@/lib/settings/today";
import type { FigureRemindersValue } from "@/lib/settings/values";

export const dynamic = "force-dynamic";

// Read per visit, on the server: the page reports the environment the app is running with now,
// and the saved choices as they stand in the data file.
export default async function SettingsRoutePage() {
  let reminders: FigureRemindersValue | null = null;
  try {
    reminders = await readSetting(prisma, "figure-reminders");
  } catch (error) {
    // The page says it couldn't read the choice; the log gets the error's name and code, never the error.
    logRouteError("settings", error);
  }
  return <SettingsPage today={readSettingsToday()} reminders={reminders} />;
}
