/** Intent translation (intake free-text -> structured profile). Cheap + fast by design.
 * The only Anthropic call left after S2.5.4h; it runs only when ANTHROPIC_API_KEY is set,
 * otherwise the keyword fallback answers. */
export const DEFAULT_INTENT_ANTHROPIC_MODEL =
  process.env.INTENT_ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001";
