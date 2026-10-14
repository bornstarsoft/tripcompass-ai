#!/usr/bin/env python3
"""Check itinerary discovery and sharing metadata without network requests."""

import re
import sys
from pathlib import Path
from urllib.parse import urlsplit

sys.dont_write_bytecode = True

from check_content import Page


class DiscoveryPage(Page):
    def __init__(self, source):
        self.meta = {}
        self.primary_links = []
        self.in_primary = False
        self.in_library = False
        self.in_table = False
        self.library_links = []
        self.table_links = []
        self.row_count = 0
        self.styles = []
        super().__init__(source)

    def handle_starttag(self, tag, attrs):
        super().handle_starttag(tag, attrs)
        attrs = dict(attrs)
        if tag == "meta":
            key = attrs.get("property", attrs.get("name", ""))
            if key.startswith(("og:", "twitter:")):
                self.meta.setdefault(key, []).append(attrs.get("content", ""))
        if tag == "nav":
            self.in_primary = "site-nav" in attrs.get("class", "").split()
        if tag == "section" and "itinerary-library" in attrs.get("class", "").split():
            self.in_library = True
        if tag == "table" and self.in_library:
            self.in_table = True
        if tag == "a":
            if self.in_primary:
                self.primary_links.append(attrs.get("href"))
            if self.in_library:
                self.library_links.append(attrs.get("href"))
                if self.in_table:
                    self.table_links.append(attrs.get("href"))
        if tag == "th" and attrs.get("scope") == "row" and self.in_table:
            self.row_count += 1
        if tag == "link" and attrs.get("rel") == "stylesheet":
            self.styles.append(attrs.get("href"))

    def handle_endtag(self, tag):
        super().handle_endtag(tag)
        if tag == "nav":
            self.in_primary = False
        if tag == "section":
            self.in_library = False
        if tag == "table":
            self.in_table = False


def check(root):
    courses = {
        "/from-seoul/seoul-to-fukuoka-weekend-trip/",
        "/itinerary/seoul-to-osaka-4-day-itinerary/",
        "/itinerary/seoul-to-tokyo-4-day-itinerary/",
        "/itinerary/fukuoka-with-parents-3-days/",
    }
    hotel = "/from-seoul/fukuoka-hakata-vs-tenjin-hotels/"
    planning = {
        "/itinerary/osaka-or-kyoto-day-trip/": "osaka-food",
        "/itinerary/fukuoka-rainy-day-plan/": "hotel-neighborhood",
        "/itinerary/tokyo-jimbocho-books-cafes/": "tokyo-neighborhoods",
        "/itinerary/osaka-doguyasuji-kitchenware-walk/": "osaka-food",
        "/itinerary/fukuoka-dazaifu-shrine-museum-day/": "fukuoka-weekend",
        "/itinerary/tokyo-kiyosumi-shirakawa-garden-art-coffee/": "tokyo-neighborhoods",
        "/itinerary/osaka-to-nara-temple-park-day/": "nara-park-day",
        "/itinerary/japan-arrival-departure-day-plan/": "hotel-neighborhood",
    }
    origin = "https://tripcompass.ai"
    pages = {}
    for file in root.rglob("index.html"):
        path = "/" + file.parent.relative_to(root).as_posix().strip(".")
        path = path.rstrip("/") + "/"
        pages[path] = DiscoveryPage(file.read_text(encoding="utf-8"))
    assert pages, "No built pages found"

    for path, page in pages.items():
        ko = path.startswith("/ko/")
        prefix = "/ko" if ko else ""
        en_path = path.removeprefix("/ko") if ko else path
        assert page.primary_links == [prefix + "/#destination-finder", prefix + "/itinerary/",
                                      prefix + "/compare/", prefix + "/from-seoul/", prefix + "/my-trips/"], f"{path}: indirect navigation"
        expected = {
            "og:title": page.title, "og:description": page.description,
            "og:url": origin + path, "og:site_name": "TripCompass AI",
            "og:type": "article" if en_path in courses | {hotel} | set(planning) else "website",
            "og:locale": "ko_KR" if ko else "en_US",
            "twitter:card": "summary_large_image",
            "twitter:title": page.title, "twitter:description": page.description,
        }
        for key, value in expected.items():
            assert page.meta.get(key) == [value], f"{path}: incorrect {key}"
        alternate = ["en_US" if ko else "ko_KR"] if page.alternates else None
        assert page.meta.get("og:locale:alternate") == alternate, f"{path}: incorrect alternate locale"
        for key in ["og:image", "og:image:type", "og:image:width", "og:image:height", "og:image:alt"]:
            assert len(page.meta.get(key, [])) == 1 and page.meta[key][0], f"{path}: missing/duplicate {key}"
        assert page.meta.get("twitter:image") == page.meta["og:image"]
        assert page.meta.get("twitter:image:alt") == page.meta["og:image:alt"]
        assert bool(re.search("[가-힣]", page.meta["og:image:alt"][0])) == ko, f"{path}: wrong image language"
        image = urlsplit(page.meta["og:image"][0])
        assert image.scheme == "https" and image.netloc == "tripcompass.ai", f"{path}: non-local sharing asset"
        assert not image.query and not image.fragment
        data = (root / image.path.lstrip("/")).read_bytes()
        assert int(page.meta["og:image:width"][0]) > 0 and int(page.meta["og:image:height"][0]) > 0
        assert image.path.startswith("/img/editorial/")
        assert page.meta["og:image:type"] == ["image/jpeg"] and data.startswith(b"\xff\xd8")
        assert page.meta["og:image:width"] == ["1200"] and len(data) < 450_000
        assert "AI" in page.meta["og:image:alt"][0]
        if en_path in courses:
            assert "short-trip-hero" not in image.path
            assert any("creativecommons.org/" in link for link in page.links), f"{path}: missing photo license"
        elif en_path == hotel:
            assert "hotel-neighborhood" in image.path, "Hotel guide must not use a park image"
        elif en_path in planning:
            assert planning[en_path] in image.path, f"{path}: incorrect planning-guide cover"
        elif en_path == "/my-trip/osaka/":
            assert "osaka-food" in image.path, f"{path}: incorrect Osaka preparation cover"
        elif en_path == "/my-trip/tokyo/":
            assert "tokyo-neighborhoods" in image.path, f"{path}: incorrect Tokyo preparation cover"
        else:
            assert "short-trip-hero" in image.path, f"{path}: wrong generic sharing illustration"

    for prefix in ["", "/ko"]:
        page = pages[prefix + "/itinerary/"]
        expected = {prefix + course for course in courses}
        assert page.row_count == 4 and len(page.table_links) == 4
        assert set(page.table_links) == expected, "Library must include the Fukuoka course outside /itinerary/"
        assert page.library_links.count(prefix + hotel) == 1 and prefix + hotel not in page.table_links
        assert all(page.links.count(link) == 1 for link in expected), "Duplicate itinerary listing"
        assert "/css/courses.css" in page.styles
    for path in ["/itinerary/tokyo-3-days/", "/itinerary/osaka-4-days/"]:
        assert path in pages["/itinerary/"].links, "Keep older guides reachable"
    for path in courses | {hotel} | set(planning):
        assert pages[path].meta["og:image"] == pages["/ko" + path].meta["og:image"]
    print(f"Discovery check passed: 2 complete itinerary libraries, direct navigation and localized sharing metadata on {len(pages)} pages.")


if __name__ == "__main__":
    check(Path(sys.argv[1]))
