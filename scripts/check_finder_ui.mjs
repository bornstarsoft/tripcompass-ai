import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import vm from "node:vm";

const script = await readFile(join(process.argv[2], "js/destination-finder.js"), "utf8");

class Element {
  children = [];
  dataset = {};
  attributes = {};
  hidden = false;
  textContent = "";
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
  setAttribute(name, value) { this.attributes[name] = value; }
}

function harness(language, fetchResponse) {
  const form = new Element();
  const button = new Element();
  button.textContent = language === "ko" ? "AI 추천 받기" : "Get AI recommendations";
  form.querySelector = () => button;
  form.querySelectorAll = () => [{ value: "food" }];
  form.elements = { namedItem: () => ({ value: "Seoul" }) };
  form.addEventListener = (_, handler) => { form.submit = handler; };
  const elements = {
    "[data-recommend-form]": form,
    "[data-dynamic-results]": new Element(),
    "[data-static-results]": new Element(),
    "[data-result-status]": new Element()
  };
  const timers = new Map();
  let timerId = 0;
  const requests = [];
  vm.runInNewContext(script, {
    document: {
      querySelector: (selector) => elements[selector],
      createElement: () => new Element(),
      documentElement: { dataset: { language }, lang: language }
    },
    window: { location: { pathname: language === "ko" ? "/ko/" : "/" } },
    AbortController,
    setTimeout: (callback, delay) => {
      assert.equal(delay, 60000);
      timers.set(++timerId, callback);
      return timerId;
    },
    clearTimeout: (id) => timers.delete(id),
    fetch: async (url, options) => {
      assert.equal(url, "/api/recommend");
      assert.equal(options.method, "POST");
      requests.push(JSON.parse(options.body));
      return fetchResponse(options);
    }
  });
  return {
    form, button, timers, requests,
    dynamic: elements["[data-dynamic-results]"],
    fallback: elements["[data-static-results]"],
    status: elements["[data-result-status]"],
    submit: () => form.submit({ preventDefault() {} })
  };
}

function response(source, language) {
  return {
    source,
    fallbackReason: "INTERNAL_DIAGNOSTIC_MUST_NOT_RENDER",
    recommendations: [{
      name: language === "ko" ? "후쿠오카" : "Fukuoka", score: 80,
      why: ["<script>untrusted text</script>"], bestFor: [], cautions: [],
      ctaUrls: Object.fromEntries(["hotel", "flight", "activity", "esim"].map((type) =>
        [type, `/go/${type}?destination=fukuoka&country=japan&lang=${language}`]))
    }]
  };
}

for (const language of ["en", "ko"]) {
  for (const source of ["backend", "cache", "openai", "mock"]) {
    const ui = harness(language, () => ({ ok: true, json: async () => response(source, language) }));
    await ui.submit();
    assert.equal(ui.requests[0].language, language);
    assert.equal(ui.dynamic.hidden, false);
    assert.equal(ui.fallback.hidden, true);
    assert.equal(ui.dynamic.children.length, 1);
    assert.equal(ui.status.dataset.state, source === "mock" ? "error" : "ready");
    assert.match(ui.status.textContent, source === "mock"
      ? /starting ideas|참고용 여행지/ : /AI recommendations are ready|AI 추천을 불러왔습니다/);
    assert.match(ui.status.textContent, /Always check current prices|예약 전 최신 가격/);
    assert.doesNotMatch(ui.status.textContent, /INTERNAL_DIAGNOSTIC|fallbackReason/);
    const actions = ui.dynamic.children[0].children.at(-1);
    assert.equal(actions.children[0].textContent, language === "ko" ? "호텔 검색" : "Search hotels");
    assert.match(actions.children[0].href, new RegExp(`lang=${language}$`));
    assert.equal(ui.button.disabled, false);
    assert.equal(ui.form.attributes["aria-busy"], "false");
    assert.equal(ui.timers.size, 0);
  }

  for (const failure of ["network", "http", "json", "empty", "timeout"]) {
    const ui = harness(language, ({ signal }) => {
      if (failure === "network") throw new Error("private transport detail");
      if (failure === "timeout") return new Promise((_, reject) => {
        signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
      });
      return {
        ok: failure !== "http", status: 503,
        json: async () => {
          if (failure === "json") throw new SyntaxError("private JSON detail");
          return { recommendations: [] };
        }
      };
    });
    const pending = ui.submit();
    assert.equal(ui.button.disabled, true);
    assert.equal(ui.form.attributes["aria-busy"], "true");
    await ui.submit();
    assert.equal(ui.requests.length, 1, "Concurrent submit must not issue another request");
    if (failure === "timeout") [...ui.timers.values()][0]();
    await pending;
    assert.equal(ui.dynamic.hidden, true);
    assert.equal(ui.fallback.hidden, false);
    assert.match(ui.status.textContent, /could not refresh|새로 불러오지 못했습니다/);
    assert.doesNotMatch(ui.status.textContent, /private|503|aborted/);
    assert.equal(ui.button.disabled, false);
    assert.equal(ui.button.textContent, language === "ko" ? "AI 추천 받기" : "Get AI recommendations");
    assert.equal(ui.form.attributes["aria-busy"], "false");
    assert.equal(ui.timers.size, 0);
    const retry = ui.submit();
    assert.equal(ui.requests.length, 2, "Failed requests must be retryable");
    if (failure === "timeout") [...ui.timers.values()][0]();
    await retry;
  }
}
console.log("Finder UI check passed: EN/KO success, fallback, timeout, retry, and duplicate-submit protection.");
