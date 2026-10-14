import assert from "node:assert/strict";
import { mountGuideReturn } from "../static/js/trip-guide-return.js";

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
console.log("Task guide return passed: allowlisted context, language links, history, focus and unavailable-state fallback; no storage access.");
