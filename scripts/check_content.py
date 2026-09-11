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
        self.alternates = {}
        self.language_options = {}
        self.in_switcher = False
        self.h1_count = 0
        self.finder_forms = []
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
        if tag == "h1":
            self.h1_count += 1
        if tag == "nav":
            self.in_switcher = "data-language-switcher" in attrs
        if tag == "form" and "data-recommend-form" in attrs:
            self.finder_forms.append(attrs)
        if tag == "meta" and attrs.get("name") == "description":
            self.description = attrs.get("content", "")
        if tag == "link" and attrs.get("rel") == "canonical":
            self.canonicals.append(attrs.get("href", ""))
        if tag == "link" and attrs.get("rel") == "alternate" and attrs.get("hreflang"):
            self.alternates[attrs["hreflang"]] = attrs.get("href", "")
        if tag == "a" and attrs.get("href"):
            self.links.append(attrs["href"])
            if self.in_switcher:
                code = attrs.get("data-language-option")
                assert code not in self.language_options, "Duplicate language option"
                self.language_options[code] = attrs

    def handle_endtag(self, tag):
        if tag == "title":
            self.in_title = False
        if tag == "nav":
            self.in_switcher = False

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
        assert page.h1_count == 1, f"{path}: expected one primary heading"
        assert page.title not in titles, f"{path}: duplicate title with {titles.get(page.title)}"
        assert page.description not in descriptions, f"{path}: duplicate description with {descriptions.get(page.description)}"
        titles[page.title], descriptions[page.description] = path, path
        assert page.canonicals == [origin + path], f"{path}: incorrect canonical"
        language = "ko" if path.startswith("/ko/") else "en"
        assert page.language == language, f"{path}: wrong page language"
        assert set(page.language_options) == {"en", "ko"}, f"{path}: wrong active language options"
        en_path = path
        if language == "ko":
            en_path = path.removeprefix("/ko")
        ko_path = "/ko/" if en_path == "/" else "/ko" + en_path
        paired = en_path in pages and ko_path in pages
        if paired:
            expected = {"en": origin + en_path, "ko": origin + ko_path, "x-default": origin + "/"}
            assert page.alternates == expected, f"{path}: incomplete language alternates"
        for code, option in page.language_options.items():
            if paired:
                expected_path = en_path if code == "en" else ko_path
            elif code == language:
                expected_path = path
            else:
                expected_path = "/ko/" if code == "ko" else "/"
            assert option["href"] == expected_path, f"{path}: language switch loses page context"
            assert (option.get("aria-current") == "true") == (code == language), f"{path}: wrong current language"
        expected_forms = 1 if path in {"/", "/ko/"} else 0
        assert len(page.finder_forms) == expected_forms, f"{path}: incorrect number of finder forms"
        for form in page.finder_forms:
            assert form.get("aria-describedby") == "finder-privacy" and "finder-privacy" in page.ids, f"{path}: missing finder data notice"
            assert "/privacy/" in page.links, f"{path}: missing privacy details link"
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
    print(f"Content check passed: {len(pages)} pages, metadata, language navigation, headings, links, anchors, and search parameters.")


if __name__ == "__main__":
    check(Path(sys.argv[1]))
