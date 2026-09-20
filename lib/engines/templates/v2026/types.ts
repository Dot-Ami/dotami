import type { EngineCitation } from "@/lib/engines/shared/types";

export type TemplateDocType =
  | "tax-form"
  | "corporate"
  | "contract"
  | "registration";

export interface TemplateReference {
  id: string;
  label: string;
  docType: TemplateDocType;
  description: string;
  prepNote: string;
  externalUrl: string;
  citations: EngineCitation[];
}
