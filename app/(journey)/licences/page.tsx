import { LicencesPage } from "@/components/licences/licences-page";
import { readNotices } from "@/lib/licences/notices";

// Read on every visit, on the server: the file belongs to the build that is running (the desktop
// app's server folder, or the top folder of a checkout), not to the code.
export const dynamic = "force-dynamic";

export default function LicencesRoutePage() {
  return <LicencesPage notices={readNotices()} />;
}
