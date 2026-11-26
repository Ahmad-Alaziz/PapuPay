import { connect } from "node:http2";

const retryable = { outcome: "retry" };
const invalidTokens = new Set(["BadDeviceToken", "DeviceTokenNotForTopic", "Unregistered"]);

function retryAfter(header) {
  if (typeof header !== "string") return 0;
  const milliseconds = /^\d+$/.test(header) ? Number(header) * 1000 : Date.parse(header) - Date.now();
  return Number.isFinite(milliseconds) ? Math.min(24 * 60 * 60 * 1000, Math.max(0, milliseconds)) : 0;
}

export function classifyAPNsResponse(status, headers, body) {
  if (status === 200) return { outcome: "sent" };
  let reason;
  try { reason = JSON.parse(body)?.reason; } catch { /* Invalid bodies are retried without logging content. */ }
  if (status === 410 || (status === 400 && invalidTokens.has(reason))) return { outcome: "unregistered" };
  return { outcome: "retry", status, afterMs: retryAfter(headers["retry-after"]) };
}

export function createApnsSender(credentials, connectSession = connect) {
  let active;
  let closed = false;
  const sockets = new Set();

  async function session() {
    if (closed) return null;
    if (active && !active.destroyed && !active.closed) return active;
    const material = await credentials();
    if (!material || closed) return null;
    if (active && !active.destroyed && !active.closed) return active;

    const socket = connectSession("https://api.push.apple.com", {
      cert: `${material.certificate.toString()}\n${material.wwdr.toString()}`,
      key: material.key,
    });
    active = socket;
    sockets.add(socket);
    const clear = () => { if (active === socket) active = undefined; };
    socket.on("error", () => { clear(); socket.destroy(); });
    socket.once("close", () => { clear(); sockets.delete(socket); });
    socket.on("goaway", () => { clear(); socket.close(); });
    socket.setTimeout(60 * 60 * 1000, () => socket.close());
    socket.unref?.();
    return socket;
  }

  return {
    async send(token, topic) {
      const socket = await session();
      if (!socket) return retryable;
      return new Promise((resolve) => {
        try {
          // Wallet uses its Pass Type ID topic and an empty JSON object, per the Wallet update protocol.
          const stream = socket.request({
            ":method": "POST", ":path": `/3/device/${token}`,
            "apns-topic": topic, "apns-priority": "5", "content-type": "application/json",
          });
          let headers = {};
          let body = "";
          const timeout = setTimeout(() => { stream.close(); resolve(retryable); }, 8000).unref();
          const settle = (result) => { clearTimeout(timeout); resolve(result); };
          stream.on("response", (value) => { headers = value; });
          stream.setEncoding("utf8");
          stream.on("data", (part) => { body += part.slice(0, Math.max(0, 1024 - body.length)); });
          stream.once("end", () => settle(classifyAPNsResponse(headers[":status"], headers, body)));
          stream.once("error", () => settle(retryable));
          stream.once("close", () => settle(retryable));
          stream.end("{}");
        } catch {
          resolve(retryable);
        }
      });
    },
    close() {
      closed = true;
      for (const socket of sockets) socket.destroy();
    },
  };
}

const leaseMs = 90_000;

export async function drainWalletNotifications({ store, passType, send, clock = Date.now, random = Math.random, stopped = () => false }) {
  for (let count = 0; count < 16 && !stopped(); count += 1) {
    const job = store.claim(passType, clock(), leaseMs);
    if (!job) break;
    const result = await Promise.resolve().then(() => send(job.push_token, passType)).catch(() => retryable);
    if (stopped()) break;
    const backoff = Math.min(6 * 60 * 60 * 1000, 5000 * 2 ** Math.min(job.attempts, 16));
    const delay = Math.max(backoff + Math.floor(backoff * 0.2 * random()), result.afterMs || 0);
    store.settle(job, result.outcome, clock() + delay);
  }
}

export function startWalletWorker(store, wallet) {
  if (!wallet.updateOrigin) return () => {};
  let closed = false;
  let timer;
  async function tick() {
    try {
      await drainWalletNotifications({
        store, passType: wallet.passTypeId,
        send: (token, topic) => wallet.deliver(token, topic), stopped: () => closed,
      });
    } catch {
      if (!closed) console.error("Wallet notification worker will retry");
    } finally {
      if (!closed) schedule();
    }
  }
  function schedule() { timer = setTimeout(tick, 3000).unref(); }
  schedule();
  return () => { closed = true; clearTimeout(timer); };
}
