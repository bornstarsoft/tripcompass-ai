#!/usr/bin/env python3
"""Validate bilingual planning guides in built HTML, without API calls."""

import sys
from pathlib import Path
from urllib.parse import parse_qs, urlsplit
from xml.etree import ElementTree

sys.dont_write_bytecode = True
from check_courses import CoursePage


class PlanningPage(CoursePage):
    def __init__(self, source):
        self.takeaways = 0
        self.in_highlights = False
        self.dates = []
        self.save_ids = []
        super().__init__(source)

    def handle_starttag(self, tag, attrs):
        super().handle_starttag(tag, attrs)
        attrs = dict(attrs)
        if "data-save-guide" in attrs:
            assert tag == "button" and "hidden" in attrs and attrs.get("aria-label")
            self.save_ids.append(attrs["data-save-guide"])
        if tag == "section" and "guide-highlights" in attrs.get("class", "").split():
            self.in_highlights = True
        if tag == "li" and self.in_highlights:
            self.takeaways += 1
        if tag == "time":
            self.dates.append(attrs.get("datetime"))

    def handle_endtag(self, tag):
        super().handle_endtag(tag)
        if tag == "section":
            self.in_highlights = False


def check(root):
    origin = "https://tripcompass.ai"
    guides = {
        "/itinerary/osaka-or-kyoto-day-trip/": {
            "titles": ["Osaka or Kyoto for One Day?", "오사카 3박 4일, 교토 하루를 넣을까 말까?"],
            "cover": "osaka-food",
            "sources": {"https://kyoto.travel/en/areas/", "https://kyoto.travel/en/getting-around",
                        "https://kyoto.travel/en/responsible-travel/"},
            "incoming": ["/itinerary/seoul-to-osaka-4-day-itinerary/"],
            "related": ["/itinerary/fukuoka-rainy-day-plan/"],
            "terms": [["Option A:", "Option B:", "day you give up", "Budget considerations"],
                      ["A안:", "B안:", "대신 뺄 일정", "예산 고려사항"]],
            "destinations": {"osaka", "kyoto"},
        },
        "/itinerary/fukuoka-rainy-day-plan/": {
            "titles": ["Fukuoka in the Rain:", "후쿠오카 비 오는 날, 하카타와 텐진 중 한 곳만"],
            "cover": "hotel-neighborhood",
            "sources": {"https://www.jrhakatacity.com/", "https://www.tenchika.com/"},
            "incoming": ["/from-seoul/seoul-to-fukuoka-weekend-trip/", "/itinerary/fukuoka-with-parents-3-days/",
                         "/from-seoul/fukuoka-hakata-vs-tenjin-hotels/"],
            "related": ["/itinerary/osaka-or-kyoto-day-trip/"],
            "terms": [["Plan A:", "Plan B:", "departure day", "Budget considerations"],
                      ["A안:", "B안:", "출국일", "예산 고려사항"]],
            "destinations": {"fukuoka"},
        },
        "/itinerary/tokyo-jimbocho-books-cafes/": {
            "titles": ["Tokyo Jimbocho Books and Cafes:", "도쿄 진보초 책방·카페 반나절:"],
            "cover": "tokyo-neighborhoods",
            "sources": {"https://www.gotokyo.org/en/destinations/central-tokyo/kanda-and-jimbocho/index.html",
                        "https://www.jimbocho-book.jp/cafe/", "https://www.jimbocho-book.jp/access/",
                        "https://www.tokyodo-web.co.jp/floor/",
                        "https://www.tokyometro.jp/lang_en/station/jimbocho/index.html"},
            "incoming": ["/itinerary/seoul-to-tokyo-4-day-itinerary/", "/compare/tokyo-vs-osaka/"],
            "related": ["/itinerary/seoul-to-tokyo-4-day-itinerary/", "/compare/tokyo-vs-osaka/",
                        "/from-seoul/japan-travel-budget/", "/itinerary/osaka-doguyasuji-kitchenware-walk/"],
            "terms": [["Two first-stop candidates", "If you do not read Japanese", "what to replace",
                       "Budget considerations", "神保町ブックセンター", "東京堂書店"],
                      ["첫 책방 후보 두 곳", "일본어를 잘 못해도", "대신 뺄 반나절", "예산 고려사항",
                       "神保町ブックセンター", "東京堂書店"]],
            "destinations": {"tokyo"},
        },
        "/itinerary/osaka-doguyasuji-kitchenware-walk/": {
            "titles": ["Osaka Doguyasuji:", "오사카 도구야스지 반나절:"],
            "cover": "osaka-food",
            "sources": {"https://www.doguyasuji.or.jp/", "https://www.doguyasuji.or.jp/shop/kyouya/",
                        "https://www.designpocket.net/", "https://www.doguyasuji.or.jp/access/",
                        "https://www.doguyasuji.or.jp/experience/"},
            "incoming": ["/itinerary/seoul-to-osaka-4-day-itinerary/", "/compare/fukuoka-vs-osaka/",
                         "/itinerary/tokyo-jimbocho-books-cafes/"],
            "related": ["/itinerary/seoul-to-osaka-4-day-itinerary/", "/itinerary/osaka-or-kyoto-day-trip/",
                        "/compare/fukuoka-vs-osaka/", "/itinerary/tokyo-jimbocho-books-cafes/",
                        "/from-seoul/japan-travel-budget/"],
            "terms": [["Plan A:", "Plan B:", "what to replace", "Budget considerations",
                       "not a free tasting", "京屋 本店", "デザインポケット 大阪本店"],
                      ["A안:", "B안:", "대신 뺄 일정", "예산 고려사항", "시식 음식이 아니라",
                       "京屋 本店", "デザインポケット 大阪本店"]],
            "destinations": {"osaka"},
        },
        "/itinerary/fukuoka-dazaifu-shrine-museum-day/": {
            "titles": ["Fukuoka to Dazaifu:", "후쿠오카 다자이후 하루:"],
            "cover": "fukuoka-weekend",
            "sources": {"https://www.dazaifutenmangu.or.jp/en/plan/first-time-visitors/",
                        "https://www.dazaifutenmangu.or.jp/en/plan/dazaifu-sightseeing/",
                        "https://www.dazaifutenmangu.or.jp/en/plan/getting-to-dazaifu-tenmangu/",
                        "https://www.kyuhaku.jp/en/", "https://www.kyuhaku.jp/en/visit/visit_qanda.html",
                        "https://www.kyuhaku.jp/en/visit/visit_top.html"},
            "incoming": ["/from-seoul/seoul-to-fukuoka-weekend-trip/", "/itinerary/fukuoka-with-parents-3-days/"],
            "related": ["/from-seoul/seoul-to-fukuoka-weekend-trip/", "/itinerary/fukuoka-with-parents-3-days/",
                        "/itinerary/fukuoka-rainy-day-plan/", "/from-seoul/fukuoka-hakata-vs-tenjin-hotels/",
                        "/from-seoul/japan-travel-budget/"],
            "terms": [["Plan A:", "Plan B:", "what to leave out", "Budget considerations", "JR Futsukaichi",
                       "太宰府天満宮", "九州国立博物館", "Stay in Fukuoka"],
                      ["A안:", "B안:", "대신 뺄 일정", "예산 고려사항", "JR 후쓰카이치",
                       "太宰府天満宮", "九州国立博物館", "후쿠오카 도심에 남기"]],
            "destinations": {"fukuoka"},
        },
        "/itinerary/tokyo-kiyosumi-shirakawa-garden-art-coffee/": {
            "titles": ["Tokyo Kiyosumi-Shirakawa:", "도쿄 기요스미시라카와 반나절:"],
            "cover": "tokyo-neighborhoods",
            "sources": {"https://www.gotokyo.org/en/destinations/eastern-tokyo/kiyosumi-shirakawa/index.html",
                        "https://www.tokyo-park.or.jp/park/kiyosumi/",
                        "https://www.mot-art-museum.jp/en/exhibitions/",
                        "https://www.mot-art-museum.jp/en/guide/museum-info/",
                        "https://www.tokyometro.jp/lang_en/station/kiyosumi-shirakawa/index.html"},
            "incoming": ["/itinerary/seoul-to-tokyo-4-day-itinerary/", "/itinerary/tokyo-jimbocho-books-cafes/"],
            "related": ["/itinerary/seoul-to-tokyo-4-day-itinerary/", "/itinerary/tokyo-jimbocho-books-cafes/",
                        "/compare/tokyo-vs-osaka/", "/from-seoul/japan-travel-budget/"],
            "terms": [["Plan A:", "Plan B:", "what to replace", "Budget considerations",
                       "清澄庭園", "東京都現代美術館", "Pick two includes the break", "Museum closure"],
                      ["A안:", "B안:", "대신 뺄 반나절", "예산 고려사항", "清澄庭園", "東京都現代美術館",
                       "두 가지에는 휴식도 포함됩니다", "미술관이 쉬는 날"]],
            "destinations": {"tokyo"},
        },
        "/itinerary/osaka-to-nara-temple-park-day/": {
            "titles": ["Nara from Osaka:", "오사카에서 나라 하루:"],
            "cover": "nara-park-day",
            "sources": {"https://www.visitnara.jp/destinations/area/nara-park/",
                        "https://www.visitnara.jp/travel-to-nara/", "https://www.todaiji.or.jp/en/access/",
                        "https://www.todaiji.or.jp/en/information/haikan/",
                        "https://www.todaiji.or.jp/en/information/daibutsuden/",
                        "https://www.visitnara.jp/venues/S01487/"},
            "incoming": ["/itinerary/seoul-to-osaka-4-day-itinerary/", "/itinerary/osaka-or-kyoto-day-trip/"],
            "related": ["/itinerary/seoul-to-osaka-4-day-itinerary/", "/itinerary/osaka-or-kyoto-day-trip/",
                        "/itinerary/osaka-doguyasuji-kitchenware-walk/", "/from-seoul/japan-travel-budget/"],
            "terms": [["what to replace", "Budget considerations", "近鉄奈良", "JR奈良", "東大寺", "大仏殿",
                       "Do not combine Nara and Kyoto", "Feeding is optional", "wild animals"],
                      ["대신 뺄 일정", "예산 고려사항", "近鉄奈良", "JR奈良", "東大寺", "大仏殿",
                       "나라와 교토를 같은 날 묶지 않습니다", "먹이 주기는 선택", "야생동물"]],
            "destinations": {"osaka", "nara"},
        },
        "/itinerary/japan-arrival-departure-day-plan/": {
            "titles": ["Japan Arrival and Departure Days:", "일본 여행 첫날·마지막 날:"],
            "cover": "hotel-neighborhood",
            "sources": {"https://www.fukuoka-airport.jp/en/access/",
                        "https://tokyo-haneda.com/en/access/index.html",
                        "https://www.narita-airport.jp/en/access/"},
            "incoming": ["/from-seoul/seoul-to-fukuoka-weekend-trip/",
                         "/itinerary/seoul-to-osaka-4-day-itinerary/",
                         "/itinerary/seoul-to-tokyo-4-day-itinerary/"],
            "related": ["/from-seoul/seoul-to-fukuoka-weekend-trip/",
                        "/itinerary/seoul-to-osaka-4-day-itinerary/",
                        "/itinerary/seoul-to-tokyo-4-day-itinerary/",
                        "/from-seoul/fukuoka-hakata-vs-tenjin-hotels/",
                        "/from-seoul/japan-travel-budget/"],
            "terms": [["Bag storage is not early check-in", "including the bag detour",
                       "A small travel-day note", "Budget considerations", "First thing to drop",
                       "not a check-in deadline", "passport details", "not a guaranteed rescue"],
                      ["짐 보관과 이른 체크인은 다릅니다", "짐 찾으러 돌아가는 길까지 역산",
                       "출발 전에 채워 두는 작은 메모", "예산 고려사항", "먼저 뺄 것",
                       "출발 시각이 수속 마감은 아닙니다", "여권 정보", "확실한 해결책은 아닙니다"]],
            "destinations": {"fukuoka", "osaka", "tokyo"},
            "go_paths": {"/go/hotel"},
            "go_count": 3,
        },
    }

    def read(path):
        return PlanningPage((root / path.lstrip("/") / "index.html").read_text(encoding="utf-8"))

    locations = {node.text for node in ElementTree.parse(root / "sitemap.xml").findall(
        ".//{http://www.sitemaps.org/schemas/sitemap/0.9}loc")}
    for index, (language, prefix) in enumerate([("en", ""), ("ko", "/ko")]):
        for path, expected in guides.items():
            url = prefix + path
            page = read(url)
            text = " ".join(page.text)
            assert page.language == language and expected["titles"][index] in page.title
            assert page.description and page.h1_count == 1
            assert "**" not in text, f"{url}: unrendered Markdown emphasis"
            assert page.canonicals == [origin + url] and origin + url in locations
            assert page.alternates == {"en": origin + path, "ko": origin + "/ko" + path, "x-default": origin + "/"}
            assert page.language_options["ko" if language == "en" else "en"]["href"] == ("/ko" + path if language == "en" else path)
            assert page.dates == ["2026-09-22"] and page.takeaways == 3
            assert {"TableOfContents", "guide-contents", "guide-highlights-title"} <= page.ids
            assert all(term in text for term in expected["terms"][index])
            if language == "en":
                assert "not a firsthand" in text or "not a timed tour or a firsthand review" in text
            else:
                assert "후기가 아닙니다" in text
            assert ("Before booking:" if language == "en" else "예약 전 확인:") in text
            assert expected["sources"] <= set(page.links)
            assert len(page.images) == 1 and expected["cover"] in page.images[0]["src"]
            assert "AI" in page.images[0]["alt"] and page.images[0]["srcset"]
            assert page.print_styles == ["/css/course-print.css"]
            assert "/js/course-tools.js" in page.scripts and not page.finder_forms
            assert len(page.tools) == 1 and "hidden" in page.tools[0]
            assert page.tools[0]["data-canonical-url"] == origin + url
            if path == "/itinerary/japan-arrival-departure-day-plan/":
                assert page.save_ids == ["travel-days"]
                assert "/js/guide-explorer.js" in page.scripts
                assert {"night-before-return", "before-checkout"} <= page.ids
                assert {"#night-before-return", "#before-checkout"} <= set(page.links)
                assert prefix + "/itinerary/japan-plan-b/#late" in page.links
                for city in ["fukuoka", "osaka", "tokyo"]:
                    assert prefix + "/my-trips/#trip-" + city in page.links
                for term in (["The night before:", "Before checkout:", "not an offline download", "not a new check", "does not mark any preparation item"] if language == "en" else ["출국 전날:", "체크아웃 직전:", "오프라인 다운로드가 아닙니다", "새로 확인한 것은 아닙니다", "준비 항목이 체크되지는 않습니다"]):
                    assert term in text
            for incoming in ["/", "/itinerary/", *expected["incoming"]]:
                assert url in read(prefix + incoming).links, f"{url}: missing incoming link from {incoming}"
            for related in expected["related"]:
                assert prefix + related in page.links
            assert prefix + "/#destination-finder" in page.links
            go = [urlsplit(link) for link in page.links if link.startswith("/go/")]
            assert {link.path for link in go} == expected.get("go_paths", {"/go/hotel", "/go/activity"})
            assert len(go) == expected.get("go_count", 2)
            destinations = set()
            for link in go:
                query = parse_qs(link.query)
                assert set(query) == {"destination", "country", "lang"}, "No affiliate IDs or special route behavior"
                assert query["lang"] == [language] and query["country"] == ["japan"]
                destinations.add(query["destination"][0])
            assert destinations == expected["destinations"]
    print(f"Planning guides check passed: {len(guides) * 2} EN/KO pages, source scope, practical choices, imagery, tools, internal links, safe CTAs and sitemap.")


if __name__ == "__main__":
    check(Path(sys.argv[1]))
