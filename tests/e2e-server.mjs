import { createServer } from "node:http";
import next from "next";

const port = 3100;
const hostname = "127.0.0.1";
const app = next({ dev: true, dir: process.cwd(), hostname, port });
const handle = app.getRequestHandler();

await app.prepare();
const server = createServer((request, response) => handle(request, response));
server.listen(port, hostname);

const close = () => {
  server.close(() => process.exit(0));
};
process.once("SIGINT", close);
process.once("SIGTERM", close);
