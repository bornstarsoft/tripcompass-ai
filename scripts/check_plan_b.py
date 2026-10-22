#!/usr/bin/env python3
"""Validate the bilingual return-visit guide and its existing-trip entry points."""
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
        super().__init__(source)

    def handle_starttag(self, tag, attrs):
        super().handle_starttag(tag, attrs)
        attrs = dict(attrs)
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
    sections = ["start", "reset", "rain", "energy", "late", "fukuoka", "osaka", "tokyo", "budget", "next", "scope"]
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
        assert not page.finder_forms and not any(link.startswith("/go/") for link in page.links)
        assert "/js/course-tools.js" in page.scripts
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
        for incoming in ["/itinerary/", "/itinerary/japan-arrival-departure-day-plan/"]:
            assert url in read(prefix + incoming).links
        assert url + "#fukuoka" in read(prefix + "/itinerary/fukuoka-rainy-day-plan/").links
        assert url not in read(prefix + "/").links, "Do not expand homepage content"
    print("Plan B passed: EN/KO, three city round trips, editorial scope, reused illustration, related guides, unchanged homepage discovery and sitemap.")


if __name__ == "__main__":
    check(Path(sys.argv[1]))
