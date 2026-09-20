# v0 release checklists

Time-boxed checks before treating v0 as released. Log outcomes in the tracking issue.

## Production smoke (after Vercel or equivalent deploy)

Run against the **hosted** URL with production env (`DATABASE_URL`, `ANTHROPIC_API_KEY` as needed).

- [ ] Home loads without a blank canvas; graph matches expected seed or last-saved venture.
- [ ] GST and incorporation toggles update the graph and projection footer.
- [ ] Node detail panel opens from a node click; citations and lens copy render.
- [ ] Lens: open, switch tabs, send a message, stream completes (requires API key).
- [ ] Export playbook: preview, Copy, Save as `.md` (skeleton path without key is acceptable for smoke).
- [ ] Venture intake: apply a scenario and confirm canvas updates.
- [ ] **Save / resume:** click **Save / resume**, confirm success; hard-refresh and confirm the saved snapshot loads (requires Postgres + migrations on the host).

## Human gates (v0 success criteria)

- [ ] **Lens GST framing:** Ask a GST registration–style question; responses stay conditional (compass-not-GPS), not prescriptive.
- [ ] **Disclaimers / compass voice:** Spot-check node detail, Lens replies, and playbook preview for consistent information-tool framing.
- [ ] **“Useful without a CPA” (PRD):** Owner judgment — if gaps exist, capture as **issues**, not silent edits.
