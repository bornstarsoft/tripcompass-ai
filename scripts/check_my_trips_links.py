#!/usr/bin/env python3
"""Verify overview task links against the existing workspace links."""

import sys
from html.parser import HTMLParser
from pathlib import Path


class TaskLinks(HTMLParser):
    def __init__(self, html):
        super().__init__(convert_charrefs=True)
        self.label_depth = 0
        self.pending_task = None
        self.workspace = {}
        self.overview = {}
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "label":
            self.label_depth += 1
        if tag == "input" and "data-prep-check" in attrs:
            self.pending_task = attrs["data-prep-check"]
        if tag == "a" and self.pending_task:
            self.workspace[self.pending_task] = attrs["href"]
            self.pending_task = None
        if tag == "a" and "data-trip-task-guide" in attrs:
            key = attrs["data-trip-task-guide"]
            assert key not in self.overview, f"Duplicate task guide: {key}"
            assert self.label_depth == 0, f"Guide link must not toggle a checkbox: {key}"
            assert "target" not in attrs and "onclick" not in attrs, f"Use native same-tab links: {key}"
            assert attrs.get("aria-label", "").startswith(("Related guide: ", "관련 가이드: ")), f"Missing accessible context: {key}"
            self.overview[key] = attrs["href"]

    def handle_endtag(self, tag):
        if tag == "label":
            self.label_depth -= 1


root = Path(sys.argv[1])
for prefix in ("", "/ko"):
    html = (root / f"{prefix}/my-trips/index.html".lstrip("/")).read_text()
    overview = TaskLinks(html).overview
    expected = {}
    for city, path in (("fukuoka", "/my-trip/"), ("osaka", "/my-trip/osaka/"), ("tokyo", "/my-trip/tokyo/")):
        workspace = TaskLinks((root / f"{prefix}{path}index.html".lstrip("/")).read_text()).workspace
        assert set(workspace) == {"flights", "hotel", "transport", "weather", "departure"}
        for task, href in workspace.items():
            assert href.startswith(prefix + "/") and not href.startswith("/go/")
            assert href.startswith("/ko/") == bool(prefix), f"Incorrect language: {href}"
            article = root / href.lstrip("/") / "index.html"
            assert article.is_file(), f"Missing guide: {href}"
            guide_html = article.read_text()
            context = f"#prep-{city}-{task}"
            target = f"trip-{city}-{task}"
            assert f"id={target}" in html or f'id="{target}"' in html
            assert guide_html.count(f"data-guide-return={context}") + guide_html.count(f'data-guide-return="{context}"') == 2
            assert f"{prefix}/my-trips/#{target}" in guide_html
            assert 'js/trip-guide-return.js' in guide_html and 'css/trip-guide-return.css' in guide_html
            expected[f"{city}:{task}"] = href + context
    assert overview == expected, f"Overview/workspace task guide mismatch: {prefix or 'en'}"
    assert html.count("관련 가이드" if prefix else "Related guide") == 30

print("My trips task guide links passed: 30 localized links, workspace parity, built targets and checkbox separation.")
