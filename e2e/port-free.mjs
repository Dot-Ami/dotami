// Stops the browser-test run before it starts if something already answers on the test port.
//
// playwright.config.ts waits for its own server to print "Ready" rather than for the port to
// answer: when two runs from different checkouts overlapped, the second run's tests reached the
// FIRST run's server while its own was still building, so they read and wrote someone else's
// database, and only the tests that open the e2e database file directly could tell (the bank and
// card account tests failed with their lists missing). Waiting for "Ready" leaves one gap, a server
// that was already up before the run began, and this closes it. A server that takes the port
// during the build makes our own `next start` fail with EADDRINUSE, which stops the run too.
import net from "node:net";

const port = Number(process.argv[2]);
if (!Number.isInteger(port) || port <= 0) {
  console.error("port-free: say which port, e.g. node e2e/port-free.mjs 3123");
  process.exit(2);
}

const socket = net.connect({ host: "127.0.0.1", port });
socket.setTimeout(2000);
socket.on("connect", () => {
  socket.destroy();
  console.error(
    `Port ${port} is already in use: another browser-test run, or a server left over from one, is answering there. ` +
      "Let that run finish or stop that server, then start again.",
  );
  process.exit(1);
});
// Refused (or no answer at all) means nothing is listening: carry on.
socket.on("error", () => process.exit(0));
socket.on("timeout", () => {
  socket.destroy();
  process.exit(0);
});
