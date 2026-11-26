import { createServer } from "node:http";
import { createPapupayApi } from "./api.mjs";

const api = createPapupayApi({ demo: process.env.PAPUPAY_DEMO === "1" });
const server = createServer((request, response) => {
  api.middleware(request, response, () => {
    response.writeHead(404, { "Cache-Control": "no-store" }).end();
  });
});
server.on("close", api.close);
server.listen(Number(process.env.PORT ?? 4173), process.env.HOST ?? "127.0.0.1");
for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => server.close());
