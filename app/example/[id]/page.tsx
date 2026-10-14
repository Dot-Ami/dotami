import { notFound } from "next/navigation";

import { ExampleCockpitClient } from "@/components/cockpit/cockpit-page-client";
import { exampleById } from "@/lib/examples";

export const dynamic = "force-dynamic";

/**
 * An invented example future, drawn read-only in the cockpit (docs/ui-spec/example/_index.md): /example/mara
 * is the front door's third door. Nothing here reads or writes the data file; any id that isn't an example
 * is not found.
 */
export default async function ExamplePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!exampleById(id)) notFound();
  return <ExampleCockpitClient exampleId={id} />;
}
