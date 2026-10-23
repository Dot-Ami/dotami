import { LandingPage } from "@/components/discovery/landing-page";
import { hasSavedIdea } from "@/lib/front-door/saved-idea";
import { prisma } from "@/lib/prisma";

// Read on every visit: Your futures and Open cockpit are offered only once an idea is saved.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  return <LandingPage hasSavedIdea={await hasSavedIdea(prisma)} />;
}
