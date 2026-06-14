(function () {
  const form = document.querySelector("[data-recommend-form]");
  const dynamicResults = document.querySelector("[data-dynamic-results]");
  const staticResults = document.querySelector("[data-static-results]");
  const status = document.querySelector("[data-result-status]");

  if (!form || !dynamicResults || !staticResults || !status) {
    return;
  }

  const submitButton = form.querySelector("button[type='submit']");
  const originalSubmitText = submitButton ? submitButton.dataset.submitLabel || submitButton.textContent : "View sample matches";

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
    badge.textContent = `${item.score}/100 match`;

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
    summary.textContent = bestFor ? `Best for ${bestFor}.` : "A practical short-trip match.";

    const caution = document.createElement("p");
    caution.className = "card-caution";
    caution.textContent = cautions.length ? `Check before booking: ${cautions.join(" ")}` : "";

    const actions = document.createElement("div");
    actions.className = "card-actions";
    const ctaUrls = item.ctaUrls || {};
    appendCta(actions, ctaUrls.hotel, "Search hotels");
    appendCta(actions, ctaUrls.flight, "Search flights");
    appendCta(actions, ctaUrls.activity, "Find activities");
    appendCta(actions, ctaUrls.esim, "Check eSIM");

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
    setStatus(data.disclaimer || "", false);
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
    setStatus("Finding mock matches...", false);

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Finding matches...";
    }

    try {
      renderRecommendations(await requestRecommendations());
    } catch {
      setStatus("Mock API results are not available right now. The static sample cards below are still available.", true);
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
