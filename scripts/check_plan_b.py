#!/usr/bin/env python3
"""Validate the bilingual return-visit guide and its existing-trip entry points."""
import json
import sys
from pathlib import Path

sys.dont_write_bytecode = True
from check_content import Page


class PlanPage(Page):
    def __init__(self, source):
        self.images = []
        self.entries = {}
        self.sections = []
        self.scripts = []
        self.saves = []
        self.saved = []
        self.guide_ids = []
        self.reading_sections = []
        super().__init__(source)

    def handle_starttag(self, tag, attrs):
        super().handle_starttag(tag, attrs)
        attrs = dict(attrs)
        if "data-guide-reading-sections" in attrs:
            self.reading_sections = json.loads(attrs["data-guide-reading-sections"])
        if "data-save-guide" in attrs:
            self.saves.append(attrs["data-save-guide"])
            assert tag == "button" and "hidden" in attrs and attrs.get("aria-label")
        if "data-trip-saved-guide" in attrs:
            self.saved.append(attrs["data-trip-saved-guide"])
        if "data-guide-ids" in attrs:
            self.guide_ids = attrs["data-guide-ids"].split(",")
        if tag == "img":
            self.images.append(attrs)
        if tag == "a" and "data-trip-plan-b" in attrs:
            self.entries[attrs["data-trip-plan-b"]] = attrs["href"]
        if tag == "h2" and attrs.get("id"):
            self.sections.append(attrs["id"])
        if tag == "script" and attrs.get("src"):
            self.scripts.append(attrs["src"])


def check(root):
    def read(url):
        return PlanPage((root / url.strip("/") / "index.html").read_text(encoding="utf-8"))

    path = "/itinerary/japan-plan-b/"
    sitemap = (root / "sitemap.xml").read_text(encoding="utf-8")
    sections = ["start", "reset", "rain", "energy", "late", "waiting", "together", "fukuoka", "osaka", "tokyo", "budget", "evening", "morning", "next", "scope"]
    related = ["/itinerary/japan-arrival-departure-day-plan/", "/itinerary/fukuoka-rainy-day-plan/",
               "/itinerary/fukuoka-with-parents-3-days/", "/itinerary/osaka-or-kyoto-day-trip/",
               "/itinerary/osaka-to-nara-temple-park-day/", "/itinerary/tokyo-jimbocho-books-cafes/",
               "/itinerary/tokyo-kiyosumi-shirakawa-garden-art-coffee/", "/from-seoul/japan-travel-budget/"]
    for prefix, title, editorial, safety in [
        ("", "Japan Trip Plan B", "Editorial review", "not a new verification"),
        ("/ko", "일본 여행 플랜 B", "편집 검토", "새로 검증한 자료가 아닙니다"),
    ]:
        url = prefix + path
        page = read(url)
        text = " ".join(page.text)
        assert title in page.title and editorial in text and safety in text
        assert page.canonicals == ["https://tripcompass.ai" + url]
        assert "<loc>https://tripcompass.ai" + url + "</loc>" in sitemap
        assert all(section in page.sections for section in sections)
        assert page.reading_sections == sections, "Keep stable reading keys aligned with article sections"
        assert [key for key in page.sections if key in sections] == sections
        for anchor in ["#waiting", "#together"]:
            assert page.links.count(anchor) >= 2, "New scenarios need both contents and quick-reset links"
        for anchor in ["#fukuoka", "#osaka", "#tokyo"]:
            assert anchor in page.links
        assert ("줄이 길거나 만석이라면" if prefix else "A long queue or no table:") in text
        assert ("취향이 다르면" if prefix else "Different interests:") in text
        assert ("예상 대기 시간은 착석 시각을 보장" if prefix else "An estimate is not a promised seating time") in text
        assert ("예시를 읽기만 해서는 메모가 저장되지" if prefix else "reading this example does not save it") in text
        assert not page.finder_forms and not any(link.startswith("/go/") for link in page.links)
        assert "/js/course-tools.js" in page.scripts
        assert "/js/guide-explorer.js" in page.scripts
        assert page.saves == ["plan-b"] and "plan-b" in page.guide_ids
        assert ("오늘 저녁" if prefix else "Tonight:") in text
        assert ("내일 아침" if prefix else "Tomorrow morning:") in text
        assert ("세 도시 목록에서 함께" if prefix else "all three city lists") in text
        assert "/js/trip-note.js" not in page.scripts, "Reading must not mount or change notes"
        assert len(page.images) == 1 and "hotel-neighborhood" in page.images[0]["src"]
        assert "AI" in page.images[0]["alt"] and page.images[0].get("srcset")
        for link in related + ["/my-trips/", "/decision-board/", "/#destination-finder"]:
            assert prefix + link in page.links
        overview = read(prefix + "/my-trips/")
        for city in ["fukuoka", "osaka", "tokyo"]:
            assert overview.entries[city] == url + "#" + city
            assert prefix + "/my-trips/#trip-" + city in page.links
        assert len(overview.entries) == 3
        assert overview.saved.count("plan-b") == 3
        for workspace in ["/my-trip/", "/my-trip/osaka/", "/my-trip/tokyo/"]:
            library = read(prefix + workspace)
            assert library.saves.count("plan-b") == 1 and url in library.links
        for other in ["/", "/from-seoul/seoul-to-fukuoka-weekend-trip/", "/itinerary/seoul-to-osaka-4-day-itinerary/", "/itinerary/seoul-to-tokyo-4-day-itinerary/"]:
            assert "plan-b" in read(prefix + other).guide_ids, "Existing save surfaces must retain Plan B"
        for incoming in ["/itinerary/", "/itinerary/japan-arrival-departure-day-plan/"]:
            assert url in read(prefix + incoming).links
        assert url + "#fukuoka" in read(prefix + "/itinerary/fukuoka-rainy-day-plan/").links
        assert url not in read(prefix + "/").links, "Do not expand homepage content"
    print("Plan B passed: EN/KO waiting/group choices, stable section keys, saved-guide continuity, three city return links, cautious editorial scope and unchanged homepage discovery.")


if __name__ == "__main__":
    check(Path(sys.argv[1]))
