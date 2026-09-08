#!/usr/bin/env python3
"""Check the published HTML, not Markdown source spellings."""

import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import parse_qs, unquote, urljoin, urlsplit


class Page(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=True)
        self.language = ""
        self.description = ""
        self.canonicals = []
        self.links = []
        self.ids = set()
        self.title = ""
        self.text = []
        self.in_title = False
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if attrs.get("id"):
            self.ids.add(attrs["id"])
        if tag == "html":
            self.language = attrs.get("lang", "")
        if tag == "title":
            self.in_title = True
        if tag == "meta" and attrs.get("name") == "description":
            self.description = attrs.get("content", "")
        if tag == "link" and attrs.get("rel") == "canonical":
            self.canonicals.append(attrs.get("href", ""))
        if tag == "a" and attrs.get("href"):
            self.links.append(attrs["href"])

    def handle_endtag(self, tag):
        if tag == "title":
            self.in_title = False

    def handle_data(self, data):
        self.text.append(data)
        if self.in_title:
            self.title += data


def check(root):
    origin = "https://tripcompass.ai"
    pages = {}
    for file in root.rglob("index.html"):
        path = "/" + file.parent.relative_to(root).as_posix().strip(".")
        path = path.rstrip("/") + "/"
        pages[path] = Page(file.read_text(encoding="utf-8"))
    assert pages, "No built pages found"

    stale = re.compile(
        r"What Phase 1 Includes|Phase 1 Itinerary Examples|first static MVP phase|"
        r"Future phases may add|Next-step CTA links|다음 단계 CTA|"
        r"MOCK API PREVIEW|View sample matches|SAMPLE RECOMMENDATIONS|한국어 섹션 준비",
        re.I,
    )
    titles, descriptions = {}, {}
    for path, page in pages.items():
        assert page.title.strip(), f"{path}: missing title"
        assert page.description.strip(), f"{path}: missing description"
        assert page.title not in titles, f"{path}: duplicate title with {titles.get(page.title)}"
        assert page.description not in descriptions, f"{path}: duplicate description with {descriptions.get(page.description)}"
        titles[page.title], descriptions[page.description] = path, path
        assert page.canonicals == [origin + path], f"{path}: incorrect canonical"
        language = "ko" if path.startswith("/ko/") else "en"
        assert page.language == language, f"{path}: wrong page language"
        assert not stale.search(" ".join(page.text)), f"{path}: stale public copy"
        for href in page.links:
            target = urlsplit(urljoin(origin + path, href))
            if target.netloc != "tripcompass.ai" or target.scheme not in ("http", "https"):
                continue
            if target.path.startswith("/go/"):
                kind = target.path.removeprefix("/go/")
                assert kind in {"hotel", "flight", "activity", "esim"}, f"{path}: unsupported search route"
                query = parse_qs(target.query)
                assert query.get("lang") == [language], f"{path}: wrong search language: {href}"
                required = {"hotel": ["destination", "country"], "activity": ["destination", "country"],
                            "flight": ["from", "to", "country"], "esim": ["country"]}[kind]
                for key in required:
                    assert len(query.get(key, [])) == 1 and re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", query[key][0]), f"{path}: invalid {key}: {href}"
                continue
            target_path = unquote(target.path)
            if target_path in pages:
                if target.fragment:
                    assert unquote(target.fragment) in pages[target_path].ids, f"{path}: missing anchor: {href}"
            else:
                assert (root / target_path.lstrip("/")).is_file(), f"{path}: broken internal link: {href}"
    print(f"Content check passed: {len(pages)} pages, metadata, links, anchors, and search parameters.")


if __name__ == "__main__":
    check(Path(sys.argv[1]))
