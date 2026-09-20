# Step 1 framing

Page: Intake (`/intake`) · Component: `components/discovery/intake-page.tsx`  
Type: static framing card (non-interactive)

## What it is

Short step-specific explanation shown only when the wizard starts on **Step 1 · Goals/Situation**.

## What it does (behavior on interact)

No interaction. It explains why the Goals step exists and when the user will see it.

## Why it exists (user purpose)

This step is only useful when the user has not already made their intent clear on the landing page, such as direct `/intake` visits or custom manual entry. It should explain that the user is selecting or describing a real-world situation so DotAmi can surface paths, sourced unlocks, and next actions.

## Copy (current labels)

Label: `What we're doing in this step`

Current body:

- `Tell us what matters most right now. We use this only to sort the paths on the next screen, and you can adjust it later.`
- `If you already picked a clear intent on the landing page, we skip this step and start with your venture details.`

Direction for next copy pass:

- Explain this step in terms of situations, not goals.
- Mention that custom descriptions are allowed when predefined cards do not fit.
- Mention immediate value: the preview should show what may apply and where the source comes from.

## State touched (field names only)

None.

## Downstream consumers (where the data goes today)

None.

## Cleanup / open questions

- If landing intent gets mapped into goal defaults later, this card should mention confirmation/editing instead of skip behavior.
- If direct `/intake` becomes rare after auth, Step 1 may be mostly a fallback.
- Needs new copy once situation cards/custom input are designed.

## Backend wiring

TBD — to be specified later.
