// [8i] One start-up, timed in a fresh Node process, for scripts/measure-database-adapter.ts:
//   node scripts/measure-database-startup.mjs <engine|adapter|encrypted> <data file> <key hex>
// Prints two numbers in milliseconds: loading Prisma (and the adapter), then opening the file and
// answering a first query. Only measures; never changes the file.
const [mode, file, keyHex] = process.argv.slice(2);
const url = `file:${file.replace(/\\/g, "/")}`;

let t = performance.now();
const { PrismaClient } = await import("@prisma/client");
// A stand-in for the adapter's factory, shaped by hand: left untyped, as the type checker reads it as
// Prisma's narrower factory type, which has no connectToShadowDb.
/** @type {any} */
let factory = null;
if (mode !== "engine") {
  const { PrismaBetterSQLite3 } = await import("@prisma/adapter-better-sqlite3");
  const inner = new PrismaBetterSQLite3({ url }, { timestampFormat: "unixepoch-ms" });
  factory = {
    provider: "sqlite",
    adapterName: inner.adapterName,
    async connect() {
      const adapter = await inner.connect();
      // `client` is the adapter's own better-sqlite3 handle, which its published type doesn't list.
      if (mode === "encrypted") /** @type {any} */ (adapter).client.pragma(`key = "x'${keyHex}'"`);
      return adapter;
    },
    connectToShadowDb: () => inner.connectToShadowDb(),
  };
}
const load = performance.now() - t;

t = performance.now();
const prisma = factory ? new PrismaClient({ adapter: factory }) : new PrismaClient({ datasourceUrl: url });
await prisma.user.findFirst();
const first = performance.now() - t;
await prisma.$disconnect();
console.log(`${load.toFixed(2)} ${first.toFixed(2)}`);
