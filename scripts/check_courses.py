#!/usr/bin/env python3
"""Validate the published content-first pilot without external requests."""

import sys
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
        super().__init__(source)

    def handle_starttag(self, tag, attrs):
        super().handle_starttag(tag, attrs)
        attrs = dict(attrs)
        if tag == "img":
            self.images.append(attrs)
        if "data-featured-course" in attrs:
            self.course_ids.append(attrs["data-featured-course"])
        if attrs.get("id"):
            self.order.append(attrs["id"])


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

    home = read("/ko/")
    assert home.course_ids == ["fukuoka", "osaka", "tokyo"]
    assert home.order.index("recommended-courses") < home.order.index("destination-finder")
    assert "#recommended-courses" in home.links and "#destination-finder" in home.links
    assert "AI 추천 받기" in " ".join(home.text)
    check_photos(home, 3)

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
        english = read(path.removeprefix("/ko"))
        assert english.language == "en" and not english.course_ids
        assert not any("/img/courses/" in img.get("src", "") for img in english.images)

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
        assert not page.alternates, "Do not invent English counterparts"
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
            assert not page.images, "Do not illustrate hotel areas with an unrelated park photo"
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
    assert not read("/").course_ids, "English homepage must retain its existing role"
    print("Course pilot check passed: 3 courses, 2 support guides, discovery links, sitemap, sources, optimized photos and English isolation.")


if __name__ == "__main__":
    check(Path(sys.argv[1]))
