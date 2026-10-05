import { SettingsPage } from "@/components/settings/settings-page";
import { readSettingsToday } from "@/lib/settings/today";

export const dynamic = "force-dynamic";

// Read per visit, on the server: the page reports the environment the app is running with now.
export default function SettingsRoutePage() {
  return <SettingsPage today={readSettingsToday()} />;
}
