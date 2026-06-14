(function () {
  const form = document.querySelector("[data-recommend-form]");
  const dynamicResults = document.querySelector("[data-dynamic-results]");
  const staticResults = document.querySelector("[data-static-results]");
  const status = document.querySelector("[data-result-status]");

  if (!form || !dynamicResults || !staticResults || !status) {
    return;
  }

  const submitButton = form.querySelector("button[type='submit']");
  const originalSubmitText = submitButton ? submitButton.dataset.submitLabel || submitButton.textContent : "Get AI recommendations";
  const messages = {
    en: {
      bookingDisclaimer: "Always check current prices, opening hours, visa rules, availability, and booking terms before booking.",
      ready: "AI recommendations are ready.",
      loading: "Asking TripCompass AI for destination matches...",
      loadingButton: "Getting AI recommendations...",
      error: "We could not refresh AI recommendations just now. You can still use the starting ideas below and try again in a moment.",
      matchLabel: "match",
      bestFor: "Best for",
      fallbackSummary: "A practical short-trip match.",
      cautionPrefix: "Check before booking:",
      hotel: "Search hotels",
      flight: "Search flights",
      activity: "Find activities",
      esim: "Check eSIM"
    },
    ko: {
      bookingDisclaimer: "예약 전 최신 가격, 영업시간, 비자 규정, 예약 가능 여부, 예약 조건을 반드시 확인하세요.",
      ready: "AI 추천을 불러왔습니다.",
      loading: "TripCompass AI가 여행지 추천을 준비하고 있습니다...",
      loadingButton: "AI 추천 불러오는 중...",
      error: "지금은 AI 추천을 새로 불러오지 못했습니다. 아래 여행지 아이디어를 참고하고 잠시 후 다시 시도해 주세요.",
      matchLabel: "추천 적합도",
      bestFor: "추천 대상",
      fallbackSummary: "짧은 해외여행에 참고할 수 있는 후보입니다.",
      cautionPrefix: "예약 전 확인:",
      hotel: "호텔 검색",
      flight: "항공권 검색",
      activity: "액티비티 찾기",
      esim: "eSIM 확인"
    }
  };

  function setStatus(message, isError) {
    status.textContent = message;
    status.hidden = !message;
    status.dataset.state = isError ? "error" : "ready";
  }

  function fieldValue(name) {
    const field = form.elements.namedItem(name);
    return field && "value" in field ? field.value : "";
  }

  function selectedTravelStyles() {
    return Array.from(form.querySelectorAll("input[name='travelStyle']:checked")).map((item) => item.value);
  }

  function currentLanguage() {
    const pageLanguage = (document.documentElement.dataset.language || document.documentElement.lang || "en").toLowerCase();
    return pageLanguage.startsWith("ko") || window.location.pathname.startsWith("/ko/") ? "ko" : "en";
  }

  function uiText(key) {
    const language = currentLanguage();
    return messages[language] && messages[language][key] ? messages[language][key] : messages.en[key];
  }

  function formPayload() {
    return {
      departureCity: fieldValue("departureCity"),
      tripLength: fieldValue("tripLength"),
      budget: fieldValue("budget"),
      travelMonth: fieldValue("travelMonth"),
      travelStyle: selectedTravelStyles(),
      travelers: fieldValue("travelers"),
      preferredRegion: fieldValue("preferredRegion"),
      language: currentLanguage()
    };
  }

  function safeGoUrl(value) {
    return typeof value === "string" && value.startsWith("/go/") ? value : "/destination-finder/";
  }

  function appendTextList(card, items) {
    const list = document.createElement("ul");
    for (const item of items) {
      const listItem = document.createElement("li");
      listItem.textContent = item;
      list.append(listItem);
    }
    card.append(list);
  }

  function appendCta(actions, href, text) {
    const link = document.createElement("a");
    link.href = safeGoUrl(href);
    link.textContent = text;
    actions.append(link);
  }

  function recommendationCard(item) {
    const card = document.createElement("article");
    card.className = "destination-card";

    const topLine = document.createElement("div");
    topLine.className = "card-topline";

    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = `${item.score}/100 ${uiText("matchLabel")}`;

    const tripLength = document.createElement("span");
    tripLength.textContent = item.suggestedTripLength || "";

    topLine.append(badge, tripLength);

    const title = document.createElement("h3");
    title.textContent = item.name;

    const meta = document.createElement("p");
    meta.className = "card-meta";
    meta.textContent = `${item.country || ""} - ${item.estimatedBudgetLevel || ""}`;

    const why = Array.isArray(item.why) ? item.why : [];
    const cautions = Array.isArray(item.cautions) ? item.cautions : [];
    const bestFor = Array.isArray(item.bestFor) ? item.bestFor.join(", ") : "";

    const summary = document.createElement("p");
    summary.textContent = bestFor ? `${uiText("bestFor")} ${bestFor}.` : uiText("fallbackSummary");

    const caution = document.createElement("p");
    caution.className = "card-caution";
    caution.textContent = cautions.length ? `${uiText("cautionPrefix")} ${cautions.join(" ")}` : "";

    const actions = document.createElement("div");
    actions.className = "card-actions";
    const ctaUrls = item.ctaUrls || {};
    appendCta(actions, ctaUrls.hotel, uiText("hotel"));
    appendCta(actions, ctaUrls.flight, uiText("flight"));
    appendCta(actions, ctaUrls.activity, uiText("activity"));
    appendCta(actions, ctaUrls.esim, uiText("esim"));

    card.append(topLine, title, meta, summary);
    appendTextList(card, why);
    if (caution.textContent) {
      card.append(caution);
    }
    card.append(actions);

    return card;
  }

  function renderRecommendations(data) {
    const recommendations = Array.isArray(data.recommendations) ? data.recommendations : [];
    if (!recommendations.length) {
      throw new Error("No recommendations returned");
    }

    dynamicResults.replaceChildren(...recommendations.map(recommendationCard));
    dynamicResults.hidden = false;
    staticResults.hidden = true;
    setStatus(`${uiText("ready")} ${data.disclaimer || uiText("bookingDisclaimer")}`, false);
  }

  async function requestRecommendations() {
    const response = await fetch("/api/recommend", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(formPayload())
    });

    if (!response.ok) {
      throw new Error(`Recommendation request failed with status ${response.status}`);
    }

    return response.json();
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    dynamicResults.hidden = true;
    dynamicResults.replaceChildren();
    staticResults.hidden = false;
    setStatus(uiText("loading"), false);

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = uiText("loadingButton");
    }

    try {
      renderRecommendations(await requestRecommendations());
    } catch {
      setStatus(uiText("error"), true);
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalSubmitText;
      }
    }
  });

  window.TripCompassDestinationFinder = {
    formPayload,
    renderRecommendations
  };
})();
