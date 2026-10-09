// Types for desktop/notices.mjs, so the TypeScript tests can import it.
export const NOTICES_FILE: string;
export const SEPARATOR: string;
export const RULE: string;
export const DESKTOP_APP_PACKAGES: readonly string[];
export const SHIPS: Readonly<Record<"dependency" | "server" | "app" | "runtime" | "styles" | "fonts", string>>;
export interface LicenceElsewhere {
  why: string;
  readme?: boolean;
  text?: string;
  file?: string;
}
export const LICENCE_ELSEWHERE: Readonly<Record<string, LicenceElsewhere>>;
export function licenceElsewhere(name: string): LicenceElsewhere | undefined;
export function readmeLicensing(dir: string): { file: string; text: string } | null;

export interface FoundPackage {
  name: string;
  version: string;
  licence: string;
  /** The package's folder relative to the node_modules folder it was found in. */
  rel: string;
}

export interface NoticeSource {
  kind: "runtime" | "package" | "inside" | "font";
  name: string;
  version: string;
  licence: string;
  ships: Set<string>;
  note?: string;
  texts: { file: string; text: string }[];
}

export function licenceFiles(dir: string): { file: string; text: string }[];
export function packagesIn(nodeModules: string, prefix?: string): FoundPackage[];
/** A test on a package name: true for one that doesn't ship (desktop/left-out.mjs's isLeftOut). */
export type LeaveOut = (name: string) => boolean;
export function dependencyClosure(root: string, names: readonly string[], options?: { copied?: boolean; leaveOut?: LeaveOut }): FoundPackage[];
export function productionPackages(root: string, options?: { leaveOut?: LeaveOut }): FoundPackage[];
export function collectNotices(root: string, options?: { standalone?: string; leaveOut?: LeaveOut }): NoticeSource[];
export function formatNotices(entries: readonly NoticeSource[], options: { version: string; desktop: boolean }): string;
export function writeNotices(root: string, out: string, options?: { standalone?: string; leaveOut?: LeaveOut }): NoticeSource[];
export function missingFromNotices(noticesText: string, nodeModulesDirs: readonly string[]): string[];
