/** Lets the contract tests import next.config.mjs, which Next.js 14 requires to stay JavaScript. */
declare module "*.mjs" {
  export const securityHeaders: { key: string; value: string }[];
  export const workerPolicy: string;
  export const receiptFilePolicy: string;
  export const apiCachePolicy: string;
  const nextConfig: {
    poweredByHeader: boolean;
    headers(): Promise<{ source: string; headers: { key: string; value: string }[] }[]>;
  };
  export default nextConfig;
}
