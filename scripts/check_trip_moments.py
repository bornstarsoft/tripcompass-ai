#!/usr/bin/env python3
"""Check the native return-visit links and their actual published anchors."""
import sys
from pathlib import Path
from urllib.parse import urlsplit

sys.dont_write_bytecode = True
from check_content import Page


class MomentsPage(Page):
    def __init__(self, source):
        self.moments = []
        self.current = None
        super().__init__(source)

    def handle_starttag(self, tag, attrs):
        super().handle_starttag(tag, attrs)
        attrs = dict(attrs)
        if attrs.get("id") == "trip-moments":
            assert tag == "details" and "open" not in attrs and "hidden" not in attrs
            self.current = {"links": [], "summaries": 0, "text": []}
            self.moments.append(self.current)
        if self.current is not None:
            assert tag not in ("script", "form", "button", "input"), "Discovery is native, read-only navigation"
            if tag == "summary":
                self.current["summaries"] += 1
            if tag == "a":
                assert "target" not in attrs and "onclick" not in attrs
                self.current["links"].append(attrs["href"])

    def handle_endtag(self, tag):
        super().handle_endtag(tag)
        if tag == "details":
            self.current = None

    def handle_data(self, data):
        super().handle_data(data)
        if self.current is not None:
            self.current["text"].append(data)


root = Path(sys.argv[1])
targets = ["/itinerary/japan-plan-b/#evening", "/itinerary/japan-plan-b/#morning",
           "/itinerary/japan-plan-b/#reset", "/itinerary/japan-arrival-departure-day-plan/#before-checkout",
           "/itinerary/japan-arrival-departure-day-plan/#after-trip"]
for prefix, labels in [
    ("", ["Guides for the moment you are in", "Tonight:", "This morning:", "Plans changed:", "Going home:", "Back home:"]),
    ("/ko", ["여행 중 다시 펼칠 가이드", "오늘 저녁:", "아침:", "계획이 바뀐 날:", "귀국하는 날:", "다녀온 뒤:"]),
]:
    def read(path):
        return MomentsPage((root / path.strip("/") / "index.html").read_text(encoding="utf-8"))

    page = read(prefix + "/my-trips/")
    assert len(page.moments) == 1, "One shared disclosure, not one per city"
    section = page.moments[0]
    assert section["summaries"] == 1
    assert section["links"] == [prefix + path for path in targets]
    text = " ".join(section["text"])
    assert all(label in text for label in labels)
    assert ("최신 항공사·교통 안내" if prefix else "current airline/operator guidance") in text
    for href in section["links"]:
        url = urlsplit(href)
        assert not url.netloc and not url.query and not url.path.startswith("/go/")
        assert url.fragment in read(url.path).ids, f"Missing published anchor: {href}"
    assert not read(prefix + "/").moments, "Keep the homepage unchanged"

print("My trips moments passed: one collapsed EN/KO disclosure, ten native guide links, published anchors and no homepage module.")
