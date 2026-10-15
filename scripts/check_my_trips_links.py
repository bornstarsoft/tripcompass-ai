#!/usr/bin/env python3
"""Verify overview task links against the existing workspace links."""

import sys
import json
from html.parser import HTMLParser
from pathlib import Path


class TaskLinks(HTMLParser):
    def __init__(self, html):
        super().__init__(convert_charrefs=True)
        self.label_depth = 0
        self.pending_task = None
        self.workspace = {}
        self.overview = {}
        self.resume = []
        self.return_panels = []
        self.return_panel = None
        self.next_task = None
        self.remaining_task = None
        self.prose_depth = 0
        self.sections = 0
        self.reading_keys = []
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "a" and "data-reading-link" in attrs:
            assert attrs.get("aria-label", "").startswith(("Continue reading: ", "읽던 위치에서 계속: "))
            self.resume.append(attrs["href"])
        if tag == "div" and (self.prose_depth or "prose" in attrs.get("class", "").split()):
            self.prose_depth += 1
            if "data-guide-reading-sections" in attrs:
                self.reading_keys = json.loads(attrs["data-guide-reading-sections"])
        if tag == "h2" and self.prose_depth == 1:
            self.sections += 1
        if "data-guide-return" in attrs:
            self.return_panel = {"context": attrs["data-guide-return"], "guides": {}, "overviews": {}, "remaining": {}, "remaining_links": {}, "checks": [], "check_guides": {}, "disclosure": False}
            self.return_panels.append(self.return_panel)
        if "data-guide-checklist" in attrs:
            assert tag == "details" and "open" not in attrs, "Use a collapsed native disclosure"
            self.return_panel["disclosure"] = True
        if "data-guide-all-check" in attrs:
            assert tag == "input" and attrs.get("type") == "checkbox" and "disabled" in attrs
            assert self.label_depth == 1, "Full checklist controls need labels"
            self.return_panel["checks"].append(attrs["data-guide-all-check"])
        if "data-guide-remaining-task" in attrs:
            self.remaining_task = attrs["data-guide-remaining-task"]
            assert self.remaining_task not in self.return_panel["remaining"]
            self.return_panel["remaining"][self.remaining_task] = True
        if "data-guide-next-task" in attrs:
            self.next_task = attrs["data-guide-next-task"]
        if tag == "a" and self.return_panel is not None:
            if "data-guide-all-link" in attrs:
                task = attrs["data-guide-all-link"]
                assert self.label_depth == 0, "Checklist links must not toggle a checkbox"
                assert "target" not in attrs and "onclick" not in attrs and "hidden" not in attrs
                assert attrs.get("aria-label", "").startswith(("Related guide: ", "관련 가이드: "))
                assert task not in self.return_panel["check_guides"], "Duplicate checklist guide"
                self.return_panel["check_guides"][task] = attrs["href"]
            if self.remaining_task:
                assert self.label_depth == 0
                self.return_panel["remaining_links"][self.remaining_task] = attrs["href"]
            for attr, kind in (("data-guide-next-link", "guides"), ("data-guide-next-overview", "overviews")):
                if attr in attrs:
                    assert self.label_depth == 0, "Next links must not toggle a checkbox"
                    assert self.next_task not in self.return_panel[kind], "Duplicate next task link"
                    self.return_panel[kind][self.next_task] = attrs["href"]
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
        if tag == "div" and self.prose_depth:
            self.prose_depth -= 1
        if tag == "li":
            self.remaining_task = None
        if tag == "aside":
            self.return_panel = None
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
            if not prefix:
                counterpart = (root / "ko" / href.lstrip("/") / "index.html").read_text()
                en, ko = TaskLinks(guide_html), TaskLinks(counterpart)
                assert len(en.reading_keys) == en.sections > 0 and len(ko.reading_keys) == ko.sections > 0, f"Missing reading sections: {href}"
                assert list(dict.fromkeys(en.reading_keys)) == list(dict.fromkeys(ko.reading_keys)), f"Language section meanings/order differ: {href}"
            context = f"#prep-{city}-{task}"
            target = f"trip-{city}-{task}"
            assert f"id={target}" in html or f'id="{target}"' in html
            assert guide_html.count(f"data-guide-return={context}") + guide_html.count(f'data-guide-return="{context}"') == 2
            assert f"{prefix}/my-trips/#{target}" in guide_html
            assert 'js/trip-guide-return.js' in guide_html and 'css/trip-guide-return.css' in guide_html
            assert 'js/trip-guide-check.js' in guide_html
            assert guide_html.count('data-guide-check-status') == guide_html.count('data-guide-return=')
            assert guide_html.count('data-guide-check ') == guide_html.count('data-guide-return=')
            panels = [panel for panel in TaskLinks(guide_html).return_panels if panel['context'] == context]
            assert len(panels) == 2
            for panel in panels:
                assert panel['disclosure'] and panel['checks'] == list(workspace)
                assert set(panel['remaining']) == set(workspace)
                assert panel['remaining_links'] == {key: path + f"#prep-{city}-{key}" for key, path in workspace.items() if key != task}
                assert panel['guides'] == {key: path + f"#prep-{city}-{key}" for key, path in workspace.items()}
                assert panel['check_guides'] == panel['guides'], "Every item, including the current/marked item, needs its guide"
                assert panel['overviews'] == {key: f"{prefix}/my-trips/#trip-{city}-{key}" for key in workspace}
            assert 'data-guide-next-complete' in guide_html
            assert guide_html.count('data-guide-progress-bar') == guide_html.count('data-guide-return=')
            assert guide_html.count('data-guide-all-status') == guide_html.count('data-guide-return=')
            assert ('전체 준비 항목' if prefix else 'All preparation items') in guide_html
            assert ('준비 진행률' if prefix else 'preparation progress') in guide_html
            expected[f"{city}:{task}"] = href + context
    assert overview == expected, f"Overview/workspace task guide mismatch: {prefix or 'en'}"
    assert set(TaskLinks(html).resume) == set(expected.values()) and len(TaskLinks(html).resume) == 15
    assert html.count("data-trip-reading=") == 3 and html.count("data-reading-clear") == 3
    assert ("마지막에 읽던 가이드" if prefix else "Last preparation guide") in html
    assert "js/my-trips-reading.js" in html
    assert html.count("관련 가이드" if prefix else "Related guide") == 30

print("My trips task guide links passed: 30 contexts, 300 full-checklist links, workspace parity, built targets and checkbox separation.")
