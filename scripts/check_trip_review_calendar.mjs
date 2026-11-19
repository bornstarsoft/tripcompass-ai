import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { mountCalendar, reviewCalendar } from "../static/js/trip-review-calendar.js";

const root = process.argv[2];
const now = new Date("2026-11-18T14:30:00Z");
const base = { now, date: "2026-11-20", uid: "review-abc123", title: "Review your Osaka trip", workspace: "https://tripcompass.ai/my-trip/osaka/" };
const calendar = reviewCalendar(base);
for (const line of ["BEGIN:VCALENDAR", "VERSION:2.0", "BEGIN:VEVENT", "UID:review-abc123", "DTSTAMP:20261118T143000Z", "DTSTART;VALUE=DATE:20261120", "SUMMARY:Review your Osaka trip", "URL:https://tripcompass.ai/my-trip/osaka/#prep-review", "DESCRIPTION:https://tripcompass.ai/my-trip/osaka/#prep-review", "TRANSP:TRANSPARENT", "END:VEVENT", "END:VCALENDAR"]) {
  assert.ok(calendar.split("\r\n").includes(line));
}
assert.doesNotMatch(calendar, /VALARM|DTEND|ORGANIZER|ATTENDEE|RRULE/);
assert.doesNotMatch(calendar, /(?<!\r)\n/);
for (const date of ["2026-11-16", "2026-11-31", "2027-02-29", "2026-1-02", "", "20261212", "2026-12-01\r\nVALARM"]) {
  assert.throws(() => reviewCalendar({ ...base, date }));
}
assert.match(reviewCalendar({ ...base, date: "2028-02-29" }), /DTSTART;VALUE=DATE:20280229/);
assert.throws(() => reviewCalendar({ ...base, uid: "bad\r\nUID:other" }));
assert.throws(() => reviewCalendar({ ...base, workspace: "javascript:invalid" }));
const title = "오사카 여행 준비 점검 ".repeat(4) + ",;\\\nnext";
const korean = reviewCalendar({ ...base, title, workspace: "https://tripcompass.ai/ko/my-trip/osaka/?test=private#notes" });
for (const line of korean.split("\r\n")) assert.ok(Buffer.byteLength(line) <= 75);
const unfolded = korean.replace(/\r\n /g, "");
assert.ok(unfolded.includes("오사카 여행 준비 점검 ".repeat(4) + "\\,\\;\\\\\\nnext"));
assert.ok(unfolded.includes("URL:https://tripcompass.ai/ko/my-trip/osaka/#prep-review\r\n"));
assert.doesNotMatch(unfolded, /private|#notes/);

for (const hash of ["", "#prep-review", "#prep-calendar", "#prep-calendar-extra"]) {
  const disclosure = { open: false };
  const doc = { querySelector: () => disclosure };
  const events = {};
  const win = { location: { hash }, addEventListener: (name, callback) => { events[name] = callback; } };
  mountCalendar(doc, win);
  assert.equal(disclosure.open, hash === "#prep-calendar", "Only the exact calendar anchor opens it, even without export support");
  disclosure.open = false;
  win.location.hash = "#prep-calendar"; events.hashchange();
  assert.equal(disclosure.open, true);
  win.location.hash = "#prep-review"; events.hashchange();
  assert.equal(disclosure.open, true, "Other anchors do not interfere with a user's disclosure");
}

const script = readFileSync(join(root, "js/trip-review-calendar.js"), "utf8");
const version = createHash("sha256").update(script).digest("hex").slice(0, 12);
for (const prefix of ["", "ko/"]) {
  const guide = readFileSync(join(root, prefix, "itinerary/japan-arrival-departure-day-plan/index.html"), "utf8");
  assert.ok(guide.includes("id=missed-review-day"));
  assert.ok(guide.includes(prefix ? "점검일을 놓쳤다면" : "Missed your review day?"));
  for (const slug of ["", "osaka/", "tokyo/"]) {
    const path = `${prefix}my-trip/${slug}`;
    const workspace = readFileSync(join(root, path, "index.html"), "utf8");
    assert.ok(guide.includes(`href=/${path}#prep-calendar`));
    assert.ok(guide.includes(`href=/${path}#prep-review`));
    assert.ok(workspace.includes(`data-workspace=https://tripcompass.ai/${path}`));
    assert.ok(workspace.includes("id=prep-review aria-labelledby=prep-review-title"));
    assert.ok(workspace.includes(`href=/${prefix}itinerary/japan-arrival-departure-day-plan/#missed-review-day`));
    assert.ok(workspace.includes("id=prep-calendar data-review-calendar"));
    assert.ok(workspace.includes("id=review-calendar-date type=date required"));
    assert.ok(workspace.includes(`/js/trip-review-calendar.js?v=${version}`));
  }
  assert.doesNotMatch(readFileSync(join(root, prefix, "index.html"), "utf8"), /trip-review-calendar|prep-calendar/);
}
assert.doesNotMatch(script, /localStorage|sessionStorage|fetch\(|sendBeacon|XMLHttpRequest/);
console.log("Trip review calendar passed: EN/KO workspaces, date handling, iCalendar output and no storage or network calls.");
