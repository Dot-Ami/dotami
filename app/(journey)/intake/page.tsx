import { Suspense } from "react";

import { IntakePage } from "@/components/discovery/intake-page";

export default function IntakeRoutePage() {
  return (
    <Suspense>
      <IntakePage />
    </Suspense>
  );
}
