import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import vm from "node:vm";

const script = await readFile(join(process.argv[2], "js/guide-explorer.js"), "utf8");
const key = "tripcompass.saved-guides.v1";
const ids = ["fukuoka", "osaka", "tokyo", "parents", "stay"];

function node(dataset = {}) {
  return {
    dataset, hidden: false, textContent: "", value: "", attributes: {}, events: {},
    addEventListener(type, handler) { this.events[type] = handler; },
    setAttribute(name, value) { this.attributes[name] = value; },
    focus() { this.focused = true; }
  };
}

function harness({ language = "en", stored = "[]", blocked = false, readBlocked = false, single = false, absent = false, extraIds = [] } = {}) {
  const state = { stored, writes: 0 };
  const feedback = node();
  const buttons = (single ? ["parents"] : ids).map(id => {
    const button = node({ saveGuide: id, guideTitle: id });
    button.hidden = true;
    button.label = node();
    button.querySelector = () => button.label;
    return button;
  });
  const tags = ["weekend food", "food shopping", "shopping", "family weekend", "stay family weekend"];
  const terms = ["Fukuoka 후쿠오카 주말", "Osaka 오사카 먹거리", "Tokyo 도쿄 카페", "parents 부모님 후쿠오카", "Hakata Tenjin 하카타 텐진 숙소"];
  const cards = single ? [] : ids.map((id, index) => {
    const card = node({ exploreCard: id, interests: tags[index], search: terms[index] });
    card.querySelector = () => buttons[index];
    return card;
  });
  const controls = single ? null : node();
  if (controls) controls.hidden = true;
  const search = node();
  const count = node();
  const empty = node();
  const reset = node();
  const filters = ["all", "weekend", "food", "shopping", "family", "stay", "saved"].map(id => {
    const filter = node();
    filter.value = id;
    filter.checked = id === "all";
    return filter;
  });
  const selectors = {
    "[data-guide-feedback]": feedback, "[data-explore-controls]": controls,
    "[data-guide-search]": search, "[data-explore-count]": count,
    "[data-explore-empty]": empty, "[data-explore-reset]": reset
  };
  const root = {
    dataset: { guideIds: [...ids, ...extraIds].join(",") }, querySelector: selector => selectors[selector],
    querySelectorAll: selector => ({
      "[data-save-guide]": buttons, "[data-explore-card]": cards,
      'input[name="guide-interest"]': filters
    })[selector]
  };
  const events = {};
  vm.runInNewContext(script, {
    document: { querySelector: () => absent ? null : root, documentElement: { lang: language } },
    window: { addEventListener: (type, handler) => { events[type] = handler; } },
    localStorage: {
      getItem: name => {
        assert.equal(name, key);
        if (readBlocked) throw new Error("private storage diagnostic");
        return state.stored;
      },
      setItem: (name, value) => {
        assert.equal(name, key);
        if (blocked) throw new Error("private storage diagnostic");
        state.stored = value;
        state.writes++;
      }
    }
  });
  return {
    state, feedback, buttons, cards, controls, count, empty, reset, events, filters,
    visible: () => cards.filter(card => !card.hidden).map(card => card.dataset.exploreCard),
    save: id => buttons.find(button => button.dataset.saveGuide === id).events.click(),
    choose: id => {
      filters.forEach(filter => { filter.checked = filter.value === id; });
      filters.find(filter => filter.checked).events.change();
    },
    search: value => { search.value = value; search.events.input(); }
  };
}

for (const language of ["en", "ko"]) {
  const ui = harness({ language });
  assert.equal(ui.controls.hidden, false);
  assert.equal(ui.state.writes, 0, "No storage writes before user action");
  assert.deepEqual(ui.visible(), ids);
  assert.ok(ui.buttons.every(button => !button.hidden && button.attributes["aria-pressed"] === "false"));
  ui.choose("food");
  assert.deepEqual(ui.visible(), ["fukuoka", "osaka"]);
  ui.choose("family");
  assert.deepEqual(ui.visible(), ["parents", "stay"]);
  ui.choose("all");
  ui.search(" ＴＯＫＹＯ  ");
  assert.deepEqual(ui.visible(), ["tokyo"], "Normalize width, case and spaces");
  ui.search("부모님 후쿠오카");
  assert.deepEqual(ui.visible(), ["parents"], "Search Korean text in either locale");
  ui.search("<script>private</script>");
  assert.equal(ui.empty.hidden, false);
  assert.deepEqual(ui.visible(), []);
  ui.reset.events.click();
  assert.deepEqual(ui.visible(), ids);
  assert.equal(ui.filters[0].focused, true);

  ui.save("parents");
  assert.deepEqual(JSON.parse(ui.state.stored), ["parents"]);
  assert.equal(ui.feedback.textContent, language === "ko" ? "이 브라우저에 저장했습니다." : "Saved in this browser.");
  const translated = harness({ language: language === "en" ? "ko" : "en", stored: ui.state.stored, single: true });
  assert.equal(translated.buttons[0].attributes["aria-pressed"], "true", "Guide and other locale share stable IDs");
  ui.choose("saved");
  assert.deepEqual(ui.visible(), ["parents"]);
  ui.save("parents");
  assert.deepEqual(ui.visible(), []);
  assert.equal(ui.reset.focused, true, "Move focus when the last saved card is removed");
  assert.equal(ui.count.textContent, language === "ko" ? "5개 중 0개 가이드" : "0 of 5 guides");

  const blocked = harness({ language, blocked: true });
  blocked.save("parents");
  blocked.save("tokyo");
  blocked.choose("saved");
  blocked.events.storage({ key, newValue: "[]" });
  blocked.events.pageshow({ persisted: true });
  assert.deepEqual(blocked.visible(), ["tokyo", "parents"], "Preserve page-only state when storage writes fail");
  assert.equal(blocked.state.writes, 0);
  assert.equal(blocked.feedback.textContent, language === "ko"
    ? "브라우저 저장을 사용할 수 없어 이 페이지에서만 유지됩니다."
    : "Browser storage is unavailable; choices stay on this page only.");
  assert.ok(!blocked.feedback.textContent.includes("private"));
}

for (const stored of ["broken JSON", '{"wrong":"shape"}', '["unknown",null,3]']) {
  const ui = harness({ stored });
  ui.choose("saved");
  assert.deepEqual(ui.visible(), []);
  ui.save("fukuoka");
  assert.deepEqual(JSON.parse(ui.state.stored), ["fukuoka"]);
}
const tabs = harness();
tabs.choose("saved");
tabs.events.storage({ key: "unrelated", newValue: '["osaka"]' });
assert.deepEqual(tabs.visible(), []);
tabs.events.storage({ key, newValue: '["osaka","unknown"]' });
assert.deepEqual(tabs.visible(), ["osaka"]);
tabs.events.storage({ key, newValue: "invalid" });
assert.deepEqual(tabs.visible(), ["osaka"]);
tabs.state.stored = '["osaka"]';
tabs.save("parents");
assert.deepEqual(JSON.parse(tabs.state.stored), ["osaka", "parents"], "Merge other tabs' saves");
tabs.save("osaka");
assert.equal(tabs.buttons.find(button => button.dataset.saveGuide === "parents").focused, true);
tabs.events.storage({ key: null });
assert.deepEqual(tabs.visible(), []);
tabs.state.stored = '["tokyo"]';
tabs.events.pageshow({ persisted: true });
assert.deepEqual(tabs.visible(), ["tokyo"]);
const unavailable = harness({ blocked: true, readBlocked: true });
unavailable.save("fukuoka");
unavailable.save("osaka");
unavailable.choose("saved");
assert.deepEqual(unavailable.visible(), ["fukuoka", "osaka"], "Storage access failure must not disable exploration");
unavailable.reset.events.click();
assert.deepEqual(unavailable.visible(), ids);
assert.equal(harness({ absent: true }).state.writes, 0);
const prepBookmarks = harness({ stored: '["tokyo","fukuoka-rain","travel-days"]', extraIds: ["fukuoka-rain", "fukuoka-dazaifu", "travel-days"] });
prepBookmarks.save("parents");
assert.deepEqual(JSON.parse(prepBookmarks.state.stored), ["tokyo", "fukuoka-rain", "travel-days", "parents"], "Saving on a course/homepage must preserve preparation-library bookmarks");
const bothTrips = harness({ stored: '["fukuoka-rain","osaka-nara","osaka-kyoto","osaka-doguyasuji"]', extraIds: ["fukuoka-rain", "osaka-nara", "osaka-kyoto", "osaka-doguyasuji"] });
bothTrips.save("parents");
assert.deepEqual(JSON.parse(bothTrips.state.stored), ["fukuoka-rain", "osaka-nara", "osaka-kyoto", "osaka-doguyasuji", "parents"]);
console.log("Guide explorer check passed: EN/KO filters, search, saved guides, safe storage fallback and cross-tab state.");
