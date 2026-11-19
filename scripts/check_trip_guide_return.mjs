import assert from "node:assert/strict";
import { mountGuideReturn } from "../static/js/trip-guide-return.js";
import { TRIPS, TASKS } from "../static/js/trip-prep-core.js";

function fixture() {
  const events = {};
  const win = { location: { hash: "#prep-osaka-hotel" }, addEventListener: (name, fn) => { events[name] = fn; } };
  Object.defineProperty(win, "localStorage", { get() { throw Error("Navigation must not access storage"); } });
  const panels = ["#prep-osaka-hotel", "#prep-osaka-hotel", "#prep-tokyo-hotel"].map(context => ({ dataset: { guideReturn: context }, hidden: true }));
  const languages = ["/article/", "/ko/article/"].map(href => ({ href, getAttribute() { return this.href; }, setAttribute(_, value) { this.href = value; } }));
  const target = () => ({ focused: false, scrolled: false, focus() { this.focused = true; }, scrollIntoView() { this.scrolled = true; } });
  const action = target();
  const checkbox = { ...target(), disabled: false, getClientRects: () => [1] };
  const row = { id: "trip-osaka-hotel", querySelector: () => checkbox, closest: () => ({ querySelector: () => action }) };
  const doc = { querySelectorAll: selector => ({ "[data-guide-return]": panels, "[data-language-switcher] a": languages, "[data-trip-task-row]": [row] })[selector] };
  mountGuideReturn(doc, win);
  return { events, win, panels, languages, checkbox, action };
}

const f = fixture();
assert.deepEqual(f.panels.map(p => p.hidden), [false, false, true]);
assert.equal(f.languages[1].href, "/ko/article/#prep-osaka-hotel");
f.events.pageshow();
assert.equal(f.languages[1].href, "/ko/article/#prep-osaka-hotel", "No repeated fragment");
for (const hash of ["", "#prep-unknown-hotel", "#prep-osaka-weather", "#https://evil.example", '#prep-osaka-hotel\"><script>']) {
  f.win.location.hash = hash; f.events.hashchange();
  assert.ok(f.panels.every(p => p.hidden));
  assert.equal(f.languages[1].href, "/ko/article/");
}
f.win.location.hash = "#trip-osaka-hotel"; f.events.pageshow();
assert.ok(f.checkbox.focused && f.checkbox.scrolled);
f.checkbox.disabled = true; f.events.pageshow();
assert.ok(f.action.focused && f.action.scrolled, "Missing preparation falls back to workspace action");
const hidden = fixture(); hidden.checkbox.getClientRects = () => [];
hidden.win.location.hash = "#trip-osaka-hotel"; hidden.events.hashchange();
assert.ok(hidden.action.focused);

for (const pathname of ["/my-trips/", "/ko/my-trips/"]) {
  const sections = ["#trip-selector", ...Object.keys(TRIPS).flatMap(city => [
    `#trip-${city}`, `#saved-guides-${city}`, `#note-title-${city}`, `#next-visit-note-${city}`,
    ...TASKS.map(task => `#trip-${city}-${task}`)
  ])];
  const paths = ["/my-trips/", "/ko/my-trips/", "/ko/", "https://elsewhere.example/my-trips/"];
  const links = paths.map(href => ({ href, getAttribute() { return this.href; }, setAttribute(_, value) { this.href = value; } }));
  const events = {}, win = { location: { pathname, hash: "#note-title-osaka", search: "?unused=fixture" }, addEventListener(type, fn) { events[type] = fn; } };
  let hidden = false, missing = false;
  const element = { closest() { return hidden ? this : null; } };
  const doc = {
    querySelector: () => ({ contains: node => node === element }),
    querySelectorAll: selector => selector === "[data-language-switcher] a" ? links : [],
    getElementById: id => !missing && sections.includes("#" + id) ? element : null
  };
  const assertLinks = hash => assert.deepEqual(links.map(link => link.href), paths.map((path, i) => i < 2 ? path + hash : path));
  mountGuideReturn(doc, win);
  assertLinks("#note-title-osaka");
  for (const hash of [...sections, "#unknown", "#trip-osaka-unknown", "#trip-osaka?value=private", "#:~:text=private", "#%2Fgo%2Fflight", ""]) {
    win.location.hash = hash; events.hashchange();
    assertLinks(sections.includes(hash) ? hash : "");
  }
  win.location.hash = "#trip-tokyo-hotel";
  hidden = true; events.pageshow(); assertLinks("");
  hidden = false; missing = true; events.pageshow(); assertLinks("");
  missing = false; events.pageshow(); assertLinks("#trip-tokyo-hotel");
}
console.log("Task guide return passed: allowlisted context, language links, history, focus and unavailable-state fallback; no storage access.");
