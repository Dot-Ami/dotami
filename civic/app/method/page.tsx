import type { Metadata } from "next";
import Link from "next/link";

import { StatusLegend } from "@/components/status-legend";
import { REVIEWS_REQUIRED } from "@/lib/rules/review";
import { VERIFICATION_MAX_AGE_DAYS } from "@/lib/rules/deadlines";

export const metadata: Metadata = { title: "How this works" };

export default function MethodPage() {
  return (
    <article className="max-w-3xl space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">How this works, and what it can&rsquo;t do</h1>
        <p className="mt-2 text-muted">
          The chain this prototype is built around: public information → traceable evidence → what
          it means → who decides → what people can do → what happened.
        </p>
      </header>

      <StatusLegend />

      <Section title="Claims are tested one proposition at a time">
        <p>
          A claim is reworded until evidence can bear on it, and a broad claim (&ldquo;the plant is
          safe&rdquo;) is split into the separate propositions it bundles. Each has its own status.
          Institutions&rsquo; statements and allegations against institutions go through the same
          process; neither is taken as true because of who said it.
        </p>
        <ul className="list-disc pl-5">
          <li>
            Repetition isn&rsquo;t corroboration: a repost or a news story retelling a record points
            back to its origin, and only origins are counted.
          </li>
          <li>
            A hazard in an animal study isn&rsquo;t a demonstrated risk at a given exposure, and
            approval isn&rsquo;t proof of safety.
          </li>
          <li>
            A patent shows a claimed idea, not that it works or is in use. Funding is a
            relationship, not proof of control.
          </li>
          <li>
            Evidence about the past, or about one activity, is kept apart from claims about the
            present or about others.
          </li>
          <li>&ldquo;Insufficient evidence&rdquo; never means false.</li>
        </ul>
      </Section>

      <Section title="Five kinds of content, always labelled">
        <p>
          What a source says (quoted, never retyped: every quotation is the source record&rsquo;s
          own text, linked to where it sits), what the evidence supports, our interpretation, what
          remains unknown, and what action is justified. Review status is shown on every claim.
        </p>
      </Section>

      <Section title="Review">
        <ul className="list-disc pl-5">
          <li>
            High-stakes claims (health, a public office-holder&rsquo;s conduct, anything an action
            rests on) need {REVIEWS_REQUIRED.highStakes} reviews; others need{" "}
            {REVIEWS_REQUIRED.other}.
          </li>
          <li>
            A claim that rests on a value estimated by eye from a chart can&rsquo;t be marked
            reviewed without a reviewer with scientific expertise.
          </li>
          <li>
            A status that a claim&rsquo;s linked evidence doesn&rsquo;t back up is shown as
            unresolved, whatever was recorded.
          </li>
          <li>
            Corrections are logged on the claim with the reason. Disagreements are logged, not
            deleted.
          </li>
        </ul>
      </Section>

      <Section title="Deadlines and legal text">
        <ul className="list-disc pl-5">
          <li>
            A deadline counts as current only if it is still ahead and was checked against its
            source in the last {VERIFICATION_MAX_AGE_DAYS} days. Otherwise it says &ldquo;check this
            date&rdquo; or &ldquo;closed&rdquo;.
          </li>
          <li>
            Proposed text is labelled &ldquo;would bind if passed: not in force&rdquo;. It
            can&rsquo;t be shown as binding, and a guideline can&rsquo;t be shown as more than
            guidance.
          </li>
          <li>
            Original wording sits beside every plain-language explanation, with a flag where a
            lawyer&rsquo;s reading is needed. None of it is legal advice.
          </li>
        </ul>
      </Section>

      <Section title="What it never does">
        <ul className="list-disc pl-5">
          <li>
            Send, file, submit, publish, join or contact anything or anyone. It drafts; you approve
            this exact text; you send it yourself.
          </li>
          <li>Name private individuals. Public offices are named by office.</li>
          <li>
            Rank people, or tell anyone what to think. Where there is no verified way to act, it
            says so.
          </li>
        </ul>
      </Section>

      <Section title="Privacy in this prototype">
        <ul className="list-disc pl-5">
          <li>No accounts, no analytics, no cookies. The server holds no data about you.</li>
          <li>
            Your place, your drafts, your coalition notes and your own log are kept in this
            browser&rsquo;s storage only, under keys starting <code>civic-trace:</code>. The
            coalition page has a button that clears them.
          </li>
          <li>
            The browser is told to block connections and form posts to any other site, and the
            server answers only on this computer.
          </li>
        </ul>
      </Section>

      <Section title="Limits">
        <ul className="list-disc pl-5">
          <li>
            Public records can&rsquo;t reveal what was never disclosed. Not being able to see
            something isn&rsquo;t evidence of wrongdoing.
          </li>
          <li>
            Nothing here certifies scientific or legal truth, and nothing here replaces qualified
            scientific or legal review.
          </li>
          <li>
            This prototype uses no AI model at all. Every assessment in it was written by hand for
            the demo.
          </li>
        </ul>
      </Section>

      <Section title="What is mocked">
        <ul className="list-disc pl-5">
          <li>
            All content: the town, the province, the bodies, the company, the substance MX-7, the
            documents, the quotations, the figures, the dates.
          </li>
          <li>
            The reviewers (&ldquo;Reviewer 1&rdquo; and so on), the archive (hashes are real, of the
            demo text), the coalition and its members.
          </li>
          <li>The dispute button. Source ingestion: sources are typed in by hand.</li>
        </ul>
        <p>
          The read-only <Link href="/api/v0">API</Link> serves the same demo data, labelled the same
          way.
        </p>
      </Section>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}
