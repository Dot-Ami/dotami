// Types for desktop/left-out.mjs, so the TypeScript tests can import it.
import type { FoundPackage } from "./notices.mjs";

export const LEFT_OUT: readonly { name: string; why: string }[];
export function isLeftOut(name: string): boolean;
export function leftOutIn(nodeModules: string): FoundPackage[];
export function removeLeftOut(nodeModules: string): FoundPackage[];
export function stillNeeded(nodeModules: string): string[];
export function requiredByServerCode(serverDir: string): string[];
