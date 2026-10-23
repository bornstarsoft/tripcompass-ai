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

function harness({ language = "en", stored = "[]", blocked = false, readBlocked = false, single = false, singleId = "parents", absent = false, extraIds = [], historyState = null, historyBlocked = false, historyReadBlocked = false, legacy = false } = {}) {
  const state = { stored, writes: 0, historyState, historyWrites: 0, historyBlocked };
  const feedback = node();
  const buttons = (single ? [singleId] : ids).map(id => {
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
  const savedContext = node();
  savedContext.hidden = true;
  const emptyTitle = node({ default: language === "ko" ? "아직 맞는 글이 없네요" : "No guides here yet", saved: language === "ko" ? "이 목록에 맞는 저장 코스가 없어요" : "No saved featured guides match" });
  const emptyDescription = node({ default: "default description", saved: "saved description" });
  const filters = ["all", "weekend", "food", "shopping", "family", "stay", "saved"].map(id => {
    const filter = node();
    filter.value = id;
    filter.checked = id === "all";
    return filter;
  });
  const selectors = {
    "[data-guide-feedback]": feedback, "[data-explore-controls]": controls,
    "[data-guide-search]": search, "[data-explore-count]": count,
    "[data-explore-empty]": empty, "[data-explore-reset]": reset,
    "[data-explore-saved-context]": legacy || single ? null : savedContext,
    "[data-explore-empty-title]": legacy || single ? null : emptyTitle,
    "[data-explore-empty-description]": legacy || single ? null : emptyDescription
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
    window: {
      addEventListener: (type, handler) => { events[type] = handler; },
      location: { pathname: language === "ko" ? "/ko/" : "/" },
      history: {
        get state() { if (historyReadBlocked) throw Error("private history detail"); return state.historyState; },
        replaceState(value, title, ...url) {
          assert.deepEqual(url, [], "Never put the search text in the URL");
          assert.equal(title, "");
          if (state.historyBlocked) throw Error("private history detail");
          state.historyState = JSON.parse(JSON.stringify(value));
          state.historyWrites++;
        }
      }
    },
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
    state, feedback, buttons, cards, controls, count, empty, reset, events, filters, searchNode: search, savedContext, emptyTitle, emptyDescription,
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
const threeTrips = harness({ stored: '["fukuoka-rain","osaka-nara","tokyo-jimbocho","tokyo-kiyosumi"]', extraIds: ["fukuoka-rain", "osaka-nara", "tokyo-jimbocho", "tokyo-kiyosumi"] });
threeTrips.save("tokyo");
assert.deepEqual(JSON.parse(threeTrips.state.stored), ["fukuoka-rain", "osaka-nara", "tokyo-jimbocho", "tokyo-kiyosumi", "tokyo"]);
for (const language of ["en", "ko"]) {
  const extraIds = ["plan-b", "travel-days", "osaka-nara", "tokyo-kiyosumi"];
  const original = '["fukuoka","travel-days","osaka-nara","tokyo-kiyosumi"]';
  const guide = harness({ language, single: true, singleId: "plan-b", stored: original, extraIds });
  assert.equal(guide.state.writes, 0);
  assert.equal(guide.state.stored, original, "Reading does not change bookmarks");
  guide.save("plan-b");
  assert.deepEqual(JSON.parse(guide.state.stored), [...JSON.parse(original), "plan-b"]);
  const translated = harness({ language: language === "en" ? "ko" : "en", single: true, singleId: "plan-b", stored: guide.state.stored, extraIds });
  assert.equal(translated.buttons[0].attributes["aria-pressed"], "true");
  const home = harness({ stored: guide.state.stored, extraIds });
  home.save("parents");
  assert.ok(JSON.parse(home.state.stored).includes("plan-b"), "Other pages must retain the shared bookmark");
  translated.save("plan-b");
  assert.equal(translated.state.stored, original);
  const blocked = harness({ language, single: true, singleId: "plan-b", blocked: true, extraIds });
  blocked.save("plan-b");
  assert.equal(blocked.state.writes, 0);
  assert.match(blocked.feedback.textContent, /page only|페이지에서만/);
}
console.log("Guide explorer check passed: EN/KO filters, search, saved guides, safe storage fallback, Plan B continuity and cross-tab state.");

for (const language of ["en", "ko"]) {
  const extraIds = ["travel-days", "plan-b", "fukuoka-rain", "osaka-nara", "tokyo-jimbocho"];
  const original = '["plan-b","fukuoka-rain","osaka-nara","tokyo-jimbocho"]';
  const guide = harness({ language, single: true, singleId: "travel-days", stored: original, extraIds });
  assert.equal(guide.state.writes, 0);
  guide.save("travel-days");
  assert.deepEqual(JSON.parse(guide.state.stored), [...JSON.parse(original), "travel-days"]);
  const translated = harness({ language: language === "en" ? "ko" : "en", single: true, singleId: "travel-days", stored: guide.state.stored, extraIds });
  assert.equal(translated.buttons[0].attributes["aria-pressed"], "true");
  translated.save("travel-days");
  assert.equal(translated.state.stored, original);
  const blocked = harness({ language, single: true, singleId: "travel-days", stored: original, blocked: true, extraIds });
  blocked.save("travel-days");
  assert.equal(blocked.state.stored, original);
  assert.match(blocked.feedback.textContent, /page only|페이지에서만/);
}
console.log("Travel-day article bookmarks passed: EN/KO, reload/language state, existing bookmarks and failed-write preservation.");

const viewKey = "tripcompassExplorerView";
for (const language of ["en", "ko"]) {
  const path = language === "ko" ? "/ko/" : "/";
  const bookmarks = '["fukuoka","osaka","tokyo"]';
  const ui = harness({ language, stored: bookmarks, historyState: { unrelated: { keep: true } } });
  assert.equal(ui.state.historyWrites, 0, "Mount is read-only");
  ui.choose("saved"); ui.search(" ＯＳＡＫＡ ");
  assert.deepEqual(ui.visible(), ["osaka"]);
  assert.deepEqual(ui.state.historyState, { unrelated: { keep: true }, [viewKey]: { version: 1, path, interest: "saved", search: " ＯＳＡＫＡ " } });
  const back = harness({ language, stored: bookmarks, historyState: ui.state.historyState });
  assert.deepEqual(back.visible(), ["osaka"], "Reload/Back reconstructs matching results");
  assert.equal(back.filters.find(x => x.checked).value, "saved");
  assert.equal(back.searchNode.value, " ＯＳＡＫＡ ");
  assert.equal(back.state.historyWrites, 0);
  back.searchNode.value = "native stale restoration";
  back.events.pageshow({ persisted: false });
  assert.equal(back.searchNode.value, " ＯＳＡＫＡ ", "Pageshow aligns restored form and filtering");
  back.state.stored = '["fukuoka"]';
  back.events.pageshow({ persisted: true });
  assert.deepEqual(back.visible(), [], "BFCache refreshes bookmarks, retaining the filter");
  back.reset.events.click();
  assert.deepEqual(back.visible(), ids);
  assert.deepEqual(back.state.historyState[viewKey], { version: 1, path, interest: "all", search: "" });
  back.state.historyState = ui.state.historyState;
  back.events.popstate();
  assert.equal(back.searchNode.value, " ＯＳＡＫＡ ");
  back.state.historyState = null;
  back.events.popstate();
  assert.deepEqual(back.visible(), ids, "An earlier unfiltered entry does not inherit a newer filter");
  assert.equal(back.searchNode.value, "");
  assert.equal(ui.state.stored, bookmarks);
  assert.equal(ui.state.writes, 0, "Filters never write bookmarks");
  assert.deepEqual(harness({ language }).visible(), ids, "Fresh visits start fresh");
  assert.deepEqual(harness({ language: language === "en" ? "ko" : "en", historyState: ui.state.historyState }).visible(), ids, "No cross-language snapshot leakage");
  for (const invalid of [null, {}, {version:2,path,interest:"saved",search:""}, {version:1,path,interest:"unknown",search:""}, {version:1,path,interest:"saved",search:7}, {version:1,path,interest:"saved",search:"x".repeat(101)}]) {
    assert.deepEqual(harness({ language, historyState: { [viewKey]: invalid } }).visible(), ids);
  }
  const failed = harness({ language, historyBlocked: true });
  failed.choose("food"); failed.search("Osaka"); failed.events.pageshow({persisted:true});
  assert.deepEqual(failed.visible(), ["osaka"], "Failed writes do not replace live BFCache choices");
  assert.equal(failed.state.historyWrites, 0);
  const denied = harness({ language, historyReadBlocked: true });
  denied.search("Tokyo"); assert.deepEqual(denied.visible(), ["tokyo"]);
  denied.events.pageshow({persisted:true}); assert.deepEqual(denied.visible(), ["tokyo"]);
  const primitive = harness({ language, historyState: "keep unrelated state" });
  primitive.choose("family"); assert.deepEqual(primitive.visible(), ["parents", "stay"]);
  assert.equal(primitive.state.historyState, "keep unrelated state");
  const single = harness({ language, single: true });
  single.save("parents"); single.events.pageshow({persisted:false});
  assert.equal(single.state.historyWrites, 0, "Article save controls do not store explorer state");
  ui.search("x".repeat(200)); assert.equal(ui.state.historyState[viewKey].search.length, 100);
}
console.log("Explorer history passed: EN/KO same-entry restore, fresh visits, reset, bounded validation, BFCache and blocked-history behavior, no URL or bookmark writes.");

for (const language of ["en", "ko"]) {
  const original = '["travel-days","plan-b","fukuoka-rain"]';
  const ui = harness({ language, stored: original, extraIds: ["travel-days", "plan-b", "fukuoka-rain"] });
  assert.equal(ui.savedContext.hidden, true, "Default homepage gains no visible control");
  ui.choose("saved");
  assert.deepEqual(ui.visible(), [], "Homepage cards are not the city guide library");
  assert.equal(ui.savedContext.hidden, false, "Other saved guides remain discoverable");
  assert.equal(ui.emptyTitle.textContent, ui.emptyTitle.dataset.saved);
  assert.equal(ui.emptyDescription.textContent, "saved description");
  assert.equal(ui.state.stored, original);
  assert.equal(ui.state.writes, 0, "Discovery never changes bookmarks");
  ui.events.storage({key, newValue:'["osaka","travel-days"]'});
  assert.deepEqual(ui.visible(), ["osaka"]);
  assert.equal(ui.savedContext.hidden, false, "Scope link remains with nonempty saved results");
  ui.search("no match"); assert.equal(ui.empty.hidden, false);
  assert.equal(ui.emptyTitle.textContent, ui.emptyTitle.dataset.saved);
  ui.reset.events.click();
  assert.equal(ui.savedContext.hidden, true);
  assert.equal(ui.emptyTitle.textContent, ui.emptyTitle.dataset.default);
  assert.equal(ui.emptyDescription.textContent, "default description");
  const restored = harness({ language, historyState: {[viewKey]: {version:1,path:language==="ko"?"/ko/":"/",interest:"saved",search:""}} });
  assert.equal(restored.savedContext.hidden, false, "Restored filter also restores its scope notice");
  for (const options of [{readBlocked:true},{stored:"invalid"},{stored:"[]"},{stored:'["unknown"]'}]) {
    const failed = harness({language,...options}); failed.choose("saved");
    assert.equal(failed.savedContext.hidden, false);
    assert.equal(failed.emptyTitle.textContent, failed.emptyTitle.dataset.saved);
    assert.equal(failed.state.writes, 0);
  }
  const old = harness({language,legacy:true}); old.choose("saved"); old.reset.events.click();
  assert.deepEqual(old.visible(),ids,"New script tolerates old cached markup");
  const home = await readFile(join(process.argv[2], language==="ko"?"ko/index.html":"index.html"),"utf8");
  const notice = home.match(/<div class=explore-saved-context[^>]*>[\s\S]*?<\/div>/)?.[0];
  assert.ok(notice && /data-explore-saved-context hidden/.test(notice),"Notice hidden without JS");
  assert.ok(notice.includes(`href=${language==="ko"?"/ko":""}/my-trips/`),"Native localized My trips link");
  assert.ok(notice.includes(language==="ko"?"도시별 저장 가이드 보기":"View saved city guides"));
}
console.log("Saved-guide discovery passed: scoped EN/KO empty copy, native city-library links, default-hidden state, filter restoration, cross-tab refresh and old-markup safety.");
