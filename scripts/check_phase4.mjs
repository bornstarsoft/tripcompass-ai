import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { onRequest } from "../functions/go/[[path]].js";

function createMockDb(options = {}) {
  const calls = [];

  return {
    calls,
    prepare(sql) {
      calls.push({ sql, binds: null, ran: false });
      const call = calls.at(-1);

      if (options.throwOnPrepare) {
        throw new Error("prepare failed");
      }

      return {
        bind(...values) {
          call.binds = values;

          if (options.throwOnBind) {
            throw new Error("bind failed");
          }

          return {
            async run() {
              call.ran = true;

              if (options.throwOnRun) {
                throw new Error("run failed");
              }

              return { success: true };
            }
          };
        }
      };
    }
  };
}

async function callRouter(path, query = "", options = {}) {
  const pending = [];
  const response = onRequest({
    request: new Request(`https://tripcompass.ai/go/${path}${query}`, {
      method: options.method || "GET",
      headers: {
        "accept-language": "ko-KR,ko;q=0.9,en;q=0.8",
        referer: "https://tripcompass.ai/from-seoul/",
        "user-agent": "TripCompass Phase 4 Check"
      }
    }),
    params: { path },
    env: options.env,
    waitUntil(promise) {
      pending.push(promise);
    }
  });

  await Promise.all(pending);
  return { response, pendingCount: pending.length };
}

function assertRedirect(response) {
  assert.equal(response.status, 302);
  assert.ok(response.headers.get("location"));
}

const hotelDb = createMockDb();
const hotelResult = await callRouter("hotel", "?destination=fukuoka", { env: { DB: hotelDb } });
assertRedirect(hotelResult.response);
assert.equal(hotelResult.pendingCount, 1);
assert.equal(hotelDb.calls.length, 1);
assert.match(hotelDb.calls[0].sql, /INSERT INTO clicks/i);
assert.match(hotelDb.calls[0].sql, /created_at/i);
assert.equal(hotelDb.calls[0].ran, true);
assert.deepEqual(hotelDb.calls[0].binds.slice(0, 6), ["hotel", "fukuoka", null, null, null, "ko-KR,ko;q=0.9,en;q=0.8"]);
assert.equal(hotelDb.calls[0].binds[6], "https://tripcompass.ai/from-seoul/");
assert.equal(hotelDb.calls[0].binds[7], "TripCompass Phase 4 Check");
assert.ok(Date.parse(hotelDb.calls[0].binds[8]));

const headDb = createMockDb();
const headResult = await callRouter("hotel", "?destination=fukuoka", { env: { DB: headDb }, method: "HEAD" });
assertRedirect(headResult.response);
assert.equal(headResult.response.headers.get("location"), hotelResult.response.headers.get("location"));
assert.equal(headResult.pendingCount, 0);
assert.equal(headDb.calls.length, 0);

const flightDb = createMockDb();
const flightResult = await callRouter("flight", "?from=seoul&to=fukuoka", { env: { DB: flightDb } });
assertRedirect(flightResult.response);
assert.deepEqual(flightDb.calls[0].binds.slice(0, 6), ["flight", null, null, "seoul", "fukuoka", "ko-KR,ko;q=0.9,en;q=0.8"]);

const esimDb = createMockDb();
const esimResult = await callRouter("esim", "?country=japan", { env: { DB: esimDb } });
assertRedirect(esimResult.response);
assert.deepEqual(esimDb.calls[0].binds.slice(0, 6), ["esim", null, "japan", null, null, "ko-KR,ko;q=0.9,en;q=0.8"]);

const noDbResult = await callRouter("activity", "?destination=osaka", { env: {} });
assertRedirect(noDbResult.response);
assert.equal(noDbResult.pendingCount, 0);

const failingDb = createMockDb({ throwOnRun: true });
const failingResult = await callRouter("hotel", "?destination=fukuoka", { env: { DB: failingDb } });
assertRedirect(failingResult.response);
assert.equal(failingResult.pendingCount, 1);
assert.equal(failingDb.calls[0].ran, true);

const schema = await readFile("db/schema.sql", "utf8");
assert.match(schema, /ON\s+clicks\s*\(\s*created_at\s*\)/i);
assert.match(schema, /ON\s+clicks\s*\(\s*type\s*,\s*created_at\s*\)/i);
assert.match(schema, /ON\s+clicks\s*\(\s*destination\s*,\s*created_at\s*\)/i);
assert.doesNotMatch(schema, /OPENAI|sk-[A-Za-z0-9_-]{20,}/);
