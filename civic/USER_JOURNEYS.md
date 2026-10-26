# Civic Trace: user journeys

*Three journeys through the demo issue (a fictional battery-metals recovery facility in fictional
East Meadowmere). Each stage names the main call to action, the screen in the prototype, and what
happens when something goes wrong or is uncertain. "Built", "Mocked" and "Deferred" mean what they
mean in PRD.md.*

Every journey has the same shape:

**Trigger → Discovery → Evidence review → Interpretation → Action → Follow-up**

---

## 1. Priya, concerned resident

Lives about 400 m from the site, with two children at the school. Has half an hour.

| Stage | What she does | Main call to action | Screen |
| --- | --- | --- | --- |
| **Trigger** | Sees a reposted clip: "Council already approved the rezoning. Mayor promises 300 jobs." | (outside the tool) | none |
| **Discovery** | Searches "rezoning"; sets "Where are you?" to *East Meadowmere, within about 1 km* | **Open the issue** | Home (`/`) |
| **Evidence review** | Reads the overview: two decisions, both undecided; "already approved" is *Contradicted*; the "300 jobs" promise is *Contradicted* (a trimmed clip); "safe for nearby residents" is *Unresolved* | **Open a claim** | Overview, claim pages |
| **Interpretation** | Sees that the air question belongs to the provincial board, not the council; that "safe" was only modelled for normal operations; that the school's value is read off a chart | **See who decides** | Decisions & authority |
| **Action** | Finds the statement of concern (open, date checked yesterday) and the hearing (open); drafts a statement, approves her exact text, copies it | **Start a draft → Approve this text → Copy** | Actions |
| **Follow-up** | Logs "I sent it" in her browser; checks the outcome log after the decision | **I sent it myself: log it** | Actions, coalition outcome log |

**Error states.**
- Searches a topic nobody has researched ("fluoride"): *"No issue matches… It can't tell you
  anything about a topic it has no reviewed evidence for, and it doesn't guess."* (Built.)
- Opens an issue that is listed but not researched: a plain "Not researched yet" panel on every tab,
  nothing filled in. (Built.)
- An evidence link fails to resolve: a visible red "Evidence link does not resolve" instead of a
  silent gap. Tests keep this from shipping. (Built.)
- Her draft still has `[placeholders]` or a phone number: the gate refuses, with the reason.
  (Built.)

**Uncertainty states.**
- "Safe for nearby residents" is *Unresolved*: the page shows what is supported (normal operations,
  annual averages), what isn't (upsets, background, children), and what would change the
  assessment. It never says "unsafe".
- The school's value is *estimated by eye* from a log-scale chart: shown with both readings, their
  ranges, and "needs expert review".

**When no verified route exists.** She asks "Can we get the parent company punished for the 2019
incident up north?" The actions page has it under *No verified route*: the order was made in
another jurisdiction and closed in 2020, and what could be researched instead (whether the Board
considers compliance history). (Built.)

**Where she stops.** If the statement-of-concern date had been checked more than 14 days earlier,
the card would say *"Check this date before relying on it"* and the overview wouldn't list it as an
upcoming point, which is how the written-submission route appears in the demo. (Built.)

---

## 2. Tom, volunteer researcher

Retired process engineer. Picks up the issue to work the open research questions.

| Stage | What he does | Main call to action | Screen |
| --- | --- | --- | --- |
| **Trigger** | The working group's open question: *"What is the model's own predicted value at the school?"* | **Take the task** | Coalition (tasks, questions) |
| **Discovery** | Opens the claim the question hangs on; follows "Open in source" to Table 5 and Figure 4 | **Open in source** | Claim page, source page |
| **Evidence review** | Sees Table 5 has no school row; reads Figure 4 (log scale) at 450 m; finds another reviewer read it differently | **Add a reading** *(Deferred: editor)* | Claim page (figure, extraction table) |
| **Interpretation** | Notes background MX-7 wasn't added: proposes the claim stay *Partly supported*, review state *Needs expert review* | **Propose a status with reasons** *(Deferred)* | Claim page (review panel) |
| **Action** | Drafts a records request for any upset or short-term modelling; checks the outcome log and finds one already filed | **Check before filing a duplicate** | Actions (records request), outcome log |
| **Follow-up** | When the response arrives (due 4 April 2030 in the demo), adds the records as a new source; the claim is re-reviewed | **Add source** *(Deferred)* | none yet |

**Error states.**
- A source changes after it was archived: the source page shows *"The text below does NOT match the
  archived copy"*; a new version is recorded instead of silently overwriting. (The check is built;
  versioning is shown as data.)
- His reading conflicts with another: both kept side by side and logged as a disagreement; the claim
  can't be marked reviewed until a science reviewer reads it. (Built.)
- He tries to mark a high-stakes claim reviewed alone: the gate shows it as *In review* until a
  second review. (Built as a rule; the editor is deferred.)

**Uncertainty states.** Every value read off a figure carries its method, range and reader; a claim
depending on such a value shows a warning and can't pass review without expertise.

**When no verified route exists.** His question "Does the Board consider compliance history?" has
no answer in the reviewed law excerpts. It stays a research question, not an assumed route.

---

## 3. Aisha, coalition organiser

Runs a residents' association. Wants one defensible position and a plan.

| Stage | What she does | Main call to action | Screen |
| --- | --- | --- | --- |
| **Trigger** | Members are angry and posting; some posts call a councillor corrupt | **Open the workspace** | Coalition |
| **Discovery** | Reads the issue overview with the group; agrees an objective tied to one route: *get upset conditions and background levels assessed before the Board decides* | **Set the objective** *(Mocked: seeded)* | Overview, coalition |
| **Evidence review** | Uses *Shared evidence* and *Open research questions*; assigns tasks by role | **Add a task** | Coalition (tasks) |
| **Interpretation** | Builds the position statement; one paragraph ("will expose children to unsafe levels") is held back: it rests on a claim with insufficient evidence | **Rephrase as an ask** | Coalition (statement check) |
| **Action** | When the statement passes the check and has two reviews, each member adapts the statement-of-concern draft and sends their own | **Start a draft** (per member) | Actions |
| **Follow-up** | Ticks milestones, logs responses, records disagreements | **Log an outcome** | Coalition (milestones, outcome log) |

**Error states.**
- A member posts a home address, a phone number or "the councillor is corrupt": *Not added*, with
  the reason and where an allegation belongs (the Integrity Commissioner). (Built.)
- The statement has an unsupported fact: *Held back*, struck through, with the reason. The
  statement shows *Not ready*. (Built.)
- Browser storage is blocked or cleared: the workspace falls back to its starting state and still
  works. (Built.)

**Uncertainty states.** The conflict-of-interest question about the Ward 2 councillor is
*Unresolved* and framed as a question for the Integrity Commissioner, with the recorded declaration
as the only fact. The route card says: *"This asks a question; it doesn't establish anything."*

**When no verified route exists.** "Make Ardent Peak vote against it": *No verified route*. Ardent
Peak votes a minority stake in the parent company for its clients, and no public process covers how
a fund manager votes. The group can research Ardent Peak's published voting policy, if one exists.

---

## Across all three

- **No dead ends without a reason.** Every empty state says why it is empty and what would fill it.
- **No verdict without evidence.** A claim's status falls back to *Unresolved* when its evidence is
  missing.
- **No action without approval.** The last step is always the person's own.
- **Deferred in every journey:** accounts, sharing, reminders, the researcher's editor, disputes.
  The prototype shows the shape of these steps with invented data and browser-local storage.
