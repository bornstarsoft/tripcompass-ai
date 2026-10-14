import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import vm from "node:vm";

const script = await readFile(join(process.argv[2], "js/course-tools.js"), "utf8");

function harness({ language = "en", clipboard = "success", print = "success", url, absent = false } = {}) {
  const nodes = Object.fromEntries(["copy", "print", "status", "manual", "link"].map(name => [name, {
    hidden: name === "manual", disabled: false, textContent: "", value: "",
    addEventListener(_, handler) { this.click = handler; },
    focus() { this.focused = true; }, select() { this.selected = true; }
  }]));
  const canonical = `https://tripcompass.ai/${language === "ko" ? "ko/" : ""}itinerary/fukuoka-with-parents-3-days/`;
  const root = {
    hidden: true, dataset: { canonicalUrl: url ?? canonical },
    querySelector: selector => nodes[selector.match(/data-course-(\w+)/)[1]]
  };
  const copied = [];
  let printed = 0;
  let completeCopy;
  const navigator = clipboard === "missing" ? {} : { clipboard: {
    writeText: async text => {
      copied.push(text);
      if (clipboard === "denied") throw new Error("private clipboard failure");
      if (clipboard === "pending") await new Promise(resolve => { completeCopy = resolve; });
    }
  } };
  const window = print === "missing" ? {} : { print: () => {
    printed++;
    if (print === "denied") throw new Error("private print failure");
  } };
  vm.runInNewContext(script, {
    document: { querySelector: () => absent ? null : root, documentElement: { lang: language } },
    navigator, window, URL
  });
  return { root, nodes, copied, canonical, printed: () => printed, completeCopy: () => completeCopy() };
}

for (const language of ["en", "ko"]) {
  const ui = harness({ language });
  assert.equal(ui.root.hidden, false);
  assert.equal(ui.nodes.manual.hidden, true);
  assert.equal(ui.copied.length, 0, "No clipboard access before a user action");
  assert.equal(ui.printed(), 0, "Do not print on page load");
  await ui.nodes.copy.click();
  assert.deepEqual(ui.copied, [ui.canonical]);
  assert.equal(ui.nodes.status.textContent, language === "ko" ? "링크를 복사했습니다." : "Link copied.");
  assert.equal(ui.nodes.copy.disabled, false);
  ui.nodes.print.click();
  assert.equal(ui.printed(), 1);
  assert.equal(ui.nodes.status.textContent, "", "Do not claim a file was saved or printed");

  for (const clipboard of ["missing", "denied"]) {
    const failed = harness({ language, clipboard });
    await failed.nodes.copy.click();
    assert.equal(failed.nodes.manual.hidden, false);
    assert.equal(failed.nodes.link.value, failed.canonical);
    assert.equal(failed.nodes.link.focused, true);
    assert.equal(failed.nodes.link.selected, true);
    assert.equal(failed.nodes.copy.disabled, false);
    assert.equal(failed.nodes.status.textContent, language === "ko" ? "자동 복사를 사용할 수 없습니다." : "Automatic copying is unavailable.");
  }

  const blocked = harness({ language, print: "denied" });
  blocked.nodes.print.click();
  assert.equal(blocked.nodes.status.textContent, language === "ko" ? "인쇄 창을 열지 못했습니다." : "Print preview could not open.");
  assert.equal(harness({ language, print: "missing" }).nodes.print.hidden, true);
}

const busy = harness({ clipboard: "pending" });
const pending = busy.nodes.copy.click();
assert.equal(busy.nodes.copy.disabled, true);
await busy.nodes.copy.click();
assert.equal(busy.copied.length, 1, "Prevent duplicate clipboard requests");
busy.completeCopy();
await pending;
assert.equal(busy.nodes.copy.disabled, false);

const clean = harness({ url: "https://tripcompass.ai/ko/itinerary/fukuoka-with-parents-3-days/?campaign=test#day-2" });
await clean.nodes.copy.click();
assert.deepEqual(clean.copied, ["https://tripcompass.ai/ko/itinerary/fukuoka-with-parents-3-days/"]);
for (const url of ["", "javascript:alert(1)", "https://name:password@example.test/guide/"]) {
  assert.equal(harness({ url }).root.hidden, true, "Do not activate tools for an invalid canonical");
}
assert.equal(harness({ absent: true }).root.hidden, true);
console.log("Course tools check passed: EN/KO copy, manual fallback, clean URLs, duplicate protection and user-initiated print.");
