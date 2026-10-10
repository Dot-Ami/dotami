// Types for desktop/receipt-crypto.mjs, so the server (lib/expenses/receipts/store.ts) and the
// TypeScript tests can import it.

/** Bytes before the ciphertext: magic, format, key id, nonce (35). */
export const ENCRYPTED_HEADER_BYTES: number;
/** How much longer an encrypted file is than the receipt it holds (51). */
export const ENCRYPTED_OVERHEAD: number;

export type ReceiptCryptoErrorKind = "not-encrypted" | "unknown-format" | "other-key" | "damaged";

export class ReceiptCryptoError extends Error {
  constructor(kind: ReceiptCryptoErrorKind);
  kind: ReceiptCryptoErrorKind;
}

export function keyIdOf(key: Uint8Array): string;
export function isEncryptedReceipt(bytes: Uint8Array): boolean;
export function encryptedKeyId(bytes: Uint8Array): string | null;
export function encryptReceipt(plain: Uint8Array, options: { key: Buffer; id: string }): Buffer;
export function decryptReceipt(file: Uint8Array, options: { key: Buffer; id: string }): Buffer;
export function receiptIdOfName(name: string): string | null;

export function encryptReceiptsIn(
  folder: string,
  key: Buffer,
  options: { isReceiptName: (name: string) => boolean; onStep?: (step: "temp-written" | "renamed", name: string) => void },
): { encrypted: number; already: number; failed: number; leftoversRemoved: number };
