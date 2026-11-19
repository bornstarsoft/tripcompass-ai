const REVIEW_TOPICS = {
  flights: ["Flights", "항공편"],
  hotel: ["Hotel", "숙소"],
  transport: ["Transport", "교통"],
  outing: ["Choose an outing", "일정 후보 고르기"],
  weather: ["Weather and venue notices", "날씨·방문지 공지"],
  departure: ["Bags and return flight", "짐 회수·귀국편"]
};

function reviewTopic(id, language) {
  return Object.hasOwn(REVIEW_TOPICS, id) ? REVIEW_TOPICS[id][language === "ko" ? 1 : 0] : "";
}

function localDay(now) {
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
}

function validReviewDay(date, now) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < localDay(now)) return false;
  const day = new Date(`${date}T00:00:00Z`);
  return Number.isFinite(day.getTime()) && day.toISOString().slice(0, 10) === date;
}

function calendarText(value) {
  return value.replace(/\\/g, "\\\\").replace(/\r\n?|\n/g, "\\n").replace(/[,;]/g, "\\$&");
}

function foldLine(line) {
  const encoder = new TextEncoder();
  let bytes = 0, folded = "";
  for (const char of line) {
    const length = encoder.encode(char).length;
    if (bytes + length > 75) { folded += "\r\n "; bytes = 1; }
    folded += char;
    bytes += length;
  }
  return folded;
}

export function reviewCalendar({ date, title, workspace, uid, topic = "", language = "en", now = new Date() }) {
  if (!validReviewDay(date, now) || !/^[a-z0-9-]+$/i.test(uid)) throw new Error("Invalid calendar event");
  const url = new URL(workspace);
  if (!/^https?:$/.test(url.protocol)) throw new Error("Invalid workspace URL");
  const link = url.origin + url.pathname + "#prep-review";
  const stamp = now.toISOString().replace(/[-:]|\.\d{3}/g, "");
  const label = reviewTopic(topic, language);
  const summary = label ? `${title}: ${label}` : title;
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//TripCompass AI//Trip Review//EN",
    "BEGIN:VEVENT", `UID:${uid}`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${date.replace(/-/g, "")}`,
    `SUMMARY:${calendarText(summary)}`, `URL:${link}`, `DESCRIPTION:${calendarText(link)}`, "TRANSP:TRANSPARENT",
    "END:VEVENT", "END:VCALENDAR", ""].map(foldLine).join("\r\n");
}

export function mountCalendar(doc, win) {
  const root = doc.querySelector("[data-review-calendar]");
  if (!root) return;
  const reveal = () => { if (win.location.hash === "#prep-calendar") root.open = true; };
  reveal();
  win.addEventListener("hashchange", reveal);
  if (!win.crypto?.randomUUID || !win.URL.createObjectURL || !("download" in doc.createElement("a"))) return;
  const form = root.querySelector("form"), date = form.querySelector("input"), status = root.querySelector("[data-review-calendar-status]");
  if (date.type !== "date") return;
  const language = doc.documentElement.lang;
  const ko = language === "ko";
  const topic = form.querySelector("[data-review-calendar-topic]");
  if (topic) for (const id of Object.keys(REVIEW_TOPICS)) {
    const option = doc.createElement("option");
    option.value = id;
    option.textContent = reviewTopic(id, language);
    topic.append(option);
  }
  date.min = localDay(new Date());
  form.addEventListener("submit", event => {
    event.preventDefault();
    const now = new Date();
    if (!validReviewDay(date.value, now)) {
      status.textContent = ko ? "오늘 이후의 날짜를 다시 골라 주세요." : "Choose a valid date today or later.";
      date.focus();
      return;
    }
    let objectURL;
    const link = doc.createElement("a");
    try {
      const data = reviewCalendar({
        date: date.value, title: root.dataset.title, workspace: root.dataset.workspace,
        uid: win.crypto.randomUUID(), topic: topic?.value, language, now
      });
      objectURL = win.URL.createObjectURL(new win.Blob([data], { type: "text/calendar;charset=utf-8" }));
      link.href = objectURL;
      link.download = "tripcompass-review.ics";
      link.hidden = true;
      doc.body.append(link);
      link.click();
      status.textContent = ko ? "파일을 받은 뒤 캘린더에서 열어 추가하세요." : "After downloading, open the file in your calendar to add it.";
    } catch {
      status.textContent = ko ? "파일을 만들지 못했습니다. 캘린더에 점검일을 직접 추가해 주세요." : "The file could not be created. Add the review date manually in your calendar.";
    } finally {
      link.remove();
      if (objectURL) win.setTimeout(() => win.URL.revokeObjectURL(objectURL), 30_000);
    }
  });
  root.querySelector("[data-review-calendar-fallback]").hidden = true;
  form.hidden = false;
}

if (typeof document !== "undefined") mountCalendar(document, window);
