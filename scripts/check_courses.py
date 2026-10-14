#!/usr/bin/env python3
"""Validate the published content-first pilot without external requests."""

import sys
import re
from pathlib import Path
from urllib.parse import parse_qs, urlsplit
from xml.etree import ElementTree

sys.dont_write_bytecode = True

from check_content import Page


class CoursePage(Page):
    def __init__(self, source):
        self.images = []
        self.course_ids = []
        self.order = []
        self.tools = []
        self.buttons = {}
        self.print_styles = []
        self.scripts = []
        self.explorer_cards = []
        self.explorer_controls = []
        self.save_buttons = []
        self.interests = []
        self.searches = []
        super().__init__(source)

    def handle_starttag(self, tag, attrs):
        super().handle_starttag(tag, attrs)
        attrs = dict(attrs)
        if tag == "img":
            self.images.append(attrs)
        if "data-featured-course" in attrs:
            self.course_ids.append(attrs["data-featured-course"])
        if "data-explore-card" in attrs:
            self.explorer_cards.append(attrs)
        if "data-explore-controls" in attrs:
            self.explorer_controls.append(attrs)
        if "data-save-guide" in attrs:
            self.save_buttons.append(attrs)
        if attrs.get("name") == "guide-interest":
            self.interests.append(attrs)
        if "data-guide-search" in attrs:
            self.searches.append(attrs)
        if attrs.get("id"):
            self.order.append(attrs["id"])
        if "data-course-tools" in attrs:
            self.tools.append(attrs)
        if tag == "button":
            for action in ("copy", "print"):
                if f"data-course-{action}" in attrs:
                    self.buttons[action] = attrs
        if tag == "link" and attrs.get("media") == "print":
            self.print_styles.append(attrs.get("href"))
        if tag == "script":
            self.scripts.append(attrs.get("src"))


def check(root):
    paths = [
        "/ko/from-seoul/seoul-to-fukuoka-weekend-trip/",
        "/ko/itinerary/seoul-to-osaka-4-day-itinerary/",
        "/ko/itinerary/seoul-to-tokyo-4-day-itinerary/",
    ]

    def read(path):
        return CoursePage((root / path.lstrip("/") / "index.html").read_text(encoding="utf-8"))

    def check_photos(page, count):
        photos = [img for img in page.images if "/img/courses/" in img.get("src", "")]
        assert len(photos) == count, "Missing course photographs"
        for img in photos:
            assert img.get("alt") and img.get("loading") == "lazy"
            assert int(img["width"]) > 0 and int(img["height"]) > 0
            variants = [img["src"]] + [part.strip().split()[0] for part in img["srcset"].split(",")]
            for url in variants:
                assert not urlsplit(url).netloc, "Photos must be hosted locally"
                asset = root / url.lstrip("/")
                data = asset.read_bytes()
                assert data[:4] == b"RIFF" and data[8:12] == b"WEBP", "Invalid WebP"
                assert len(data) < 250_000, "Oversized photo rendition"
        assert any("commons.wikimedia.org/wiki/File:" in link for link in page.links)
        assert any("creativecommons.org/" in link for link in page.links)

    def check_art(page, count):
        covers = [img for img in page.images if "/img/editorial/" in img.get("src", "") and "short-trip-hero" not in img["src"]]
        assert len(covers) == count, "Missing generated editorial covers"
        assert "AI travel illustration" in " ".join(page.text) or "AI 여행 일러스트" in " ".join(page.text)
        for img in covers:
            assert "AI" in img["alt"] and img.get("loading") == "lazy"
            assert int(img["width"]) == 960 and int(img["height"]) > 0
            for variant in img["srcset"].split(","):
                data = (root / variant.strip().split()[0].lstrip("/")).read_bytes()
                assert data[:4] == b"RIFF" and data[8:12] == b"WEBP"
                assert len(data) < 300_000, "Oversized generated cover"

    home = read("/ko/")
    assert home.course_ids == ["fukuoka", "osaka", "tokyo"]
    assert home.order.index("recommended-courses") < home.order.index("destination-finder")
    assert "#recommended-courses" in home.links and "#destination-finder" in home.links
    assert "AI 추천 받기" in " ".join(home.text)
    check_art(home, 5)

    for path, days in zip(paths, [3, 4, 4]):
        assert path in home.links
        page = read(path)
        text = " ".join(page.text)
        for expected in ["이 코스의 선택", "이런 사람에게 추천", "추천 여행 기간", "숙소 권역", "비가 오거나", "예산 고려사항", "주의할 점", "자료 확인과 출처", "예약 전 비교하기", "직접 방문한 후기가 아닙니다", "2026-09-12"]:
            assert expected in text, f"{path}: missing {expected}"
        for day in range(1, days + 1):
            assert f"{day}일차" in text
        assert "TableOfContents" in page.ids
        assert all(other in page.links for other in paths if other != path)
        assert "/ko/#destination-finder" in page.links
        assert "/ko/#recommended-courses" in page.links
        assert any(urlsplit(link).netloc in {"gofukuoka.jp", "www.ohorikouen.jp", "www.japan.travel", "www.gotokyo.org"} for link in page.links)
        go = [link for link in page.links if link.startswith("/go/")]
        assert len(go) == 4 and all("lang=ko" in link for link in go)
        check_photos(page, 1)

    parent_path = "/ko/itinerary/fukuoka-with-parents-3-days/"
    hotel_path = "/ko/from-seoul/fukuoka-hakata-vs-tenjin-hotels/"
    support = {
        parent_path: "부모님과 후쿠오카 2박 3일: 휴식을 남기는 여행 코스",
        hotel_path: "후쿠오카 숙소 위치: 하카타 vs 텐진, 어디에 묵을까?",
    }
    sitemap = ElementTree.parse(root / "sitemap.xml")
    locations = {node.text for node in sitemap.findall(".//{http://www.sitemaps.org/schemas/sitemap/0.9}loc")}
    for path, title in support.items():
        page = read(path)
        text = " ".join(page.text)
        assert title in page.title and page.language == "ko"
        assert page.canonicals == ["https://tripcompass.ai" + path]
        assert page.alternates["en"] == "https://tripcompass.ai" + path.removeprefix("/ko")
        assert "https://tripcompass.ai" + path in locations
        assert path in home.links and path in read(paths[0]).links
        assert path in read("/ko/best-short-family-trips-from-korea/").links
        assert path in read("/ko/compare/fukuoka-vs-osaka/").links
        for expected in ["이런 사람에게 추천", "추천 여행 기간", "예산 고려사항", "주의할 점", "예약 전 비교하기", "2026-09-12"]:
            assert expected in text, f"{path}: missing {expected}"
        assert "TableOfContents" in page.ids
        for target in [*support, paths[0], "/ko/#destination-finder", "/ko/from-seoul/japan-travel-budget/"]:
            if target != path:
                assert target in page.links, f"{path}: missing related link {target}"
        assert "https://www.fukuoka-airport.jp/en/access/subway.html" in page.links
        assert "https://subway.city.fukuoka.lg.jp/subway/barrier/universal/" in page.links
        go = [urlsplit(link) for link in page.links if link.startswith("/go/")]
        expected_types = {"hotel", "flight", "esim"}
        if path == parent_path:
            expected_types.add("activity")
            for day in range(1, 4):
                assert f"{day}일차" in text
            check_photos(page, 1)
        else:
            assert "후쿠오카 일반 검색" in text
            assert all("/img/editorial/hotel-neighborhood" in img["src"] for img in page.images), "Use the conceptual hotel-area illustration, not a park photo"
        assert {url.path.removeprefix("/go/") for url in go} == expected_types
        for url in go:
            query = parse_qs(url.query)
            assert query["lang"] == ["ko"] and query["country"] == ["japan"]
            assert not set(query) - {"lang", "country", "destination", "from", "to"}
            if "destination" in query:
                assert query["destination"] == ["fukuoka"]
            if "to" in query:
                assert query["to"] == ["fukuoka"] and query["from"] == ["seoul"]

    assert parent_path in read("/ko/itinerary/").links
    assert hotel_path in read("/ko/from-seoul/").links
    for comparison, expected, related in [
        ("fukuoka-vs-osaka", "같은 2박 3일", paths[:2]),
        ("tokyo-vs-osaka", "같은 3박 4일", paths[1:]),
    ]:
        page = read(f"/ko/compare/{comparison}/")
        assert expected in " ".join(page.text)
        assert all(path in page.links for path in related)
    english_home = read("/")
    assert english_home.course_ids == home.course_ids
    assert english_home.order.index("recommended-courses") < english_home.order.index("destination-finder")
    assert "Explore recommended itineraries" in " ".join(english_home.text)
    assert "#recommended-courses" in english_home.links and "#destination-finder" in english_home.links
    assert english_home.finder_forms and "Get AI recommendations" in " ".join(english_home.text)
    check_art(english_home, 5)
    for homepage in (home, english_home):
        assert [card["data-explore-card"] for card in homepage.explorer_cards] == ["fukuoka", "osaka", "tokyo", "parents", "stay"]
        assert all("hidden" not in card for card in homepage.explorer_cards), "All guides must work without JavaScript"
        assert len(homepage.explorer_controls) == 1 and "hidden" in homepage.explorer_controls[0]
        assert len(homepage.save_buttons) == 5 and all("hidden" in button for button in homepage.save_buttons)
        assert [item["value"] for item in homepage.interests] == ["all", "weekend", "food", "shopping", "family", "stay", "saved"]
        assert all(item["type"] == "radio" for item in homepage.interests)
        assert homepage.searches[0]["type"] == "search" and homepage.searches[0]["maxlength"] == "100"
        assert homepage.scripts.count("/js/guide-explorer.js") == 1
        hero = [img for img in homepage.images if "short-trip-hero" in img.get("src", "")]
        assert len(hero) == 1 and hero[0]["fetchpriority"] == "high" and "AI" in hero[0]["alt"]
        for variant in hero[0]["srcset"].split(","):
            assert (root / variant.strip().split()[0].lstrip("/")).stat().st_size < 350_000
    for path, days in zip([*paths, parent_path, hotel_path], [3, 4, 4, 3, 0]):
        en_path = path.removeprefix("/ko")
        page, korean = read(en_path), read(path)
        for localized, url, labels in [(page, en_path, ["Copy link", "Print guide"]),
                                       (korean, path, ["링크 복사", "가이드 인쇄"])]:
            check_art(localized, 1)
            assert "guide-contents" in localized.ids and "guide-highlights-title" in localized.ids
            assert len(localized.tools) == 1 and "hidden" in localized.tools[0], "Hide unusable controls without JavaScript"
            assert localized.tools[0]["data-canonical-url"] == "https://tripcompass.ai" + url
            for action, label in zip(["copy", "print"], labels):
                assert localized.buttons[action]["aria-label"] == label
                assert localized.buttons[action]["type"] == "button"
            assert localized.print_styles == ["/css/course-print.css"]
            assert localized.scripts.count("/js/course-tools.js") == 1
            assert localized.scripts.count("/js/guide-explorer.js") == 1
            assert len(localized.save_buttons) == 1 and "hidden" in localized.save_buttons[0]
        text = " ".join(page.text)
        assert page.language == "en" and not re.search("[가-힣]", page.title + page.description)
        assert en_path in english_home.links
        assert "https://tripcompass.ai" + en_path in locations
        assert page.alternates == {"en": "https://tripcompass.ai" + en_path, "ko": "https://tripcompass.ai" + path, "x-default": "https://tripcompass.ai/"}
        assert page.language_options["ko"]["href"] == path
        assert korean.language_options["en"]["href"] == en_path
        for expected in ["Who this page is for", "Suggested trip length", "Budget considerations", "Cautions", "Sources reviewed", "not a firsthand review", "2026-09-12"]:
            assert expected in text, f"{en_path}: missing {expected}"
        for day in range(1, days + 1):
            assert f"Day {day}:" in text
        assert "TableOfContents" in page.ids
        assert "/#destination-finder" in page.links and "/#recommended-courses" in page.links
        if days:
            assert "If it rains" in text and "Choosing a hotel area" in text
            check_photos(page, 1)
        else:
            assert all("/img/editorial/hotel-neighborhood" in img["src"] for img in page.images) and "generic Fukuoka search" in text
        assert [img["src"] for img in page.images] == [img["src"] for img in korean.images]
        assert all(not re.search("[가-힣]", img["alt"]) for img in page.images)
        external = lambda p: {link for link in p.links if urlsplit(link).netloc}
        assert external(page) == external(korean), f"{en_path}: source or license mismatch"
        english_go = [link for link in page.links if link.startswith("/go/")]
        korean_go = [link.replace("lang=ko", "lang=en") for link in korean.links if link.startswith("/go/")]
        assert set(english_go) == set(korean_go), f"{en_path}: search parameter mismatch"
        for related in [*paths, parent_path, hotel_path]:
            if related in korean.links and related != path:
                assert related.removeprefix("/ko") in page.links
    for source in ["/ko/compare/fukuoka-vs-osaka/", "/ko/compare/tokyo-vs-osaka/", "/ko/best-short-family-trips-from-korea/", "/ko/itinerary/", "/ko/from-seoul/"]:
        en_page = read(source.removeprefix("/ko"))
        for related in [*paths, parent_path, hotel_path]:
            if related in read(source).links:
                assert related.removeprefix("/ko") in en_page.links
    for path in ["/", "/ko/", "/itinerary/", "/ko/itinerary/"]:
        page = read(path)
        assert not page.tools and not page.print_styles and "/js/course-tools.js" not in page.scripts
    assert "ISC License" in (root / "licenses/lucide.txt").read_text()
    print("Course parity check passed: both homepages, 5 EN/KO guide pairs, shared photos, localized credits, daily routes, related links, sitemap and reciprocal alternates.")


if __name__ == "__main__":
    check(Path(sys.argv[1]))
