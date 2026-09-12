import { defaultState, validateState, summarize, encodeState, decodeState, goLinks, STORAGE_KEY } from "./decision-core.js";

const board = document.querySelector("[data-decision-board]");
if (board) {
  const copy = JSON.parse(document.querySelector("[data-decision-copy]").textContent);
  const language = document.documentElement.dataset.language === "ko" ? "ko" : "en";
  const form = board.querySelector("[data-board-form]");
  const error = board.querySelector("[data-board-error]");
  const status = board.querySelector("[data-board-status]");
  const shareOutput = board.querySelector("[data-share-output]");
  const shareLink = board.querySelector("[data-share-link]");
  const money = value => value === null ? copy.unknown : new Intl.NumberFormat(language === "ko" ? "ko-KR" : "en-US", { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(value);
  const phrase = (key, replacements) => Object.entries(replacements).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, value), copy[key]);
  const field = name => form.elements.namedItem(name);
  const value = name => field(name).validity.badInput ? "invalid" : field(name).value;
  function paragraph(text, className = "") {
    const element = document.createElement("p");
    element.textContent = text;
    element.className = className;
    return element;
  }
  function read() {
    return {
      version: 1,
      ...Object.fromEntries(["from", "people", "rooms", "budget", "buffer"].map(key => [key, value(key)])),
      options: [0, 1].map(i => Object.fromEntries(["city", "airfare", "hotel", "nights", "other", "arrival", "departure"].map(key => [key, value(`${key}${i}`)]))),
      opinions: [0, 1].map(i => ({ priority: field(`priority${i}`).value, pick: field(`pick${i}`).value }))
    };
  }
  function write(state) {
    for (const key of ["from", "people", "rooms", "budget", "buffer"]) field(key).value = state[key] ?? "";
    state.options.forEach((option, i) => Object.entries(option).forEach(([key, value]) => { field(`${key}${i}`).value = value ?? ""; }));
    state.opinions.forEach((opinion, i) => Object.entries(opinion).forEach(([key, value]) => { field(`${key}${i}`).value = value; }));
  }
  function synchronizePicks() {
    const cities = [field("city0").value, field("city1").value];
    for (const i of [0, 1]) {
      const select = field(`pick${i}`);
      for (const option of select.options) option.hidden = option.disabled = Boolean(option.value && !cities.includes(option.value));
      if (select.value && !cities.includes(select.value)) select.value = "";
    }
  }
  function render() {
    const { state, errors } = validateState(read());
    for (const input of form.querySelectorAll("input, select")) {
      input.setAttribute("aria-invalid", String(errors.includes(input.name)));
      if (errors.includes(input.name)) input.setAttribute("aria-describedby", "board-input-error");
      else input.removeAttribute("aria-describedby");
    }
    error.id = "board-input-error";
    error.hidden = errors.length === 0;
    error.textContent = state?.options[0].city === state?.options[1].city ? copy.duplicate : copy.invalid;
    for (const button of ["[data-board-share]", "[data-board-save]"]) board.querySelector(button).disabled = errors.length > 0;
    // Do not leave old results or search links beside invalid, newly edited inputs.
    if (errors.length) {
      board.querySelectorAll("[data-totals], [data-board-ctas], [data-board-summary], [data-agreement]").forEach(node => node.replaceChildren());
      for (const link of document.querySelectorAll("[data-language-switcher] [data-language-option]")) {
        const url = new URL(link.href);
        url.hash = "";
        link.href = url.href;
      }
      return null;
    }
    const comparison = summarize(state);
    state.options.forEach((option, i) => {
      const result = comparison.results[i];
      const totals = board.querySelector(`[data-totals="${i}"]`);
      totals.replaceChildren(
        paragraph(copy.total), paragraph(money(result.subtotal), "decision-amount"),
        paragraph(`${copy.perPerson}: ${money(result.perPerson)}`),
        paragraph(`${result.entered} ${copy.coverage}`, "fine-print"),
        paragraph(result.complete ? copy.complete : copy.partial, "fine-print"),
        paragraph(`${copy.time}: ${result.time === null ? copy.unknown : `${result.time.hours} ${copy.hours}`}`)
      );
      if (result.budgetDifference !== null) totals.append(paragraph(phrase(result.budgetDifference > 0 ? "overBudget" : "withinBudget", { amount: money(Math.abs(result.budgetDifference)) })));
      if (result.time && result.time.calendarNights !== option.nights) totals.append(paragraph(copy.nightsWarning, "fine-print"));
      const actions = board.querySelector(`[data-board-ctas="${i}"]`);
      actions.replaceChildren();
      for (const [type, url] of Object.entries(goLinks(option.city, state.from, language))) {
        const link = document.createElement("a");
        link.href = url;
        link.textContent = copy[`${type}Cta`];
        link.setAttribute("aria-label", `${link.textContent}: ${copy.cities[option.city]}`);
        actions.append(link);
      }
    });
    const costText = comparison.costDifference === null ? copy.costMissing : comparison.costDifference === 0 ? copy.costEqual : phrase("costLower", { city: copy.cities[state.options[comparison.costDifference < 0 ? 0 : 1].city], amount: money(Math.abs(comparison.costDifference)) });
    const timeText = comparison.timeDifference === null ? copy.timeMissing : comparison.timeDifference === 0 ? copy.timeEqual : phrase("timeMore", { city: copy.cities[state.options[comparison.timeDifference > 0 ? 0 : 1].city], hours: Math.abs(comparison.timeDifference) });
    board.querySelector("[data-board-summary]").replaceChildren(paragraph(costText), paragraph(timeText));
    const [a, b] = state.opinions;
    board.querySelector("[data-agreement]").textContent = !a.pick || !b.pick ? copy.pending : a.pick === b.pick ? phrase("agreement", { city: copy.cities[a.pick] }) : copy.disagreement;
    for (const link of document.querySelectorAll("[data-language-switcher] [data-language-option]")) {
      const url = new URL(link.href);
      url.hash = encodeState(state);
      link.href = url.href;
    }
    return state;
  }
  function edited() {
    synchronizePicks();
    shareOutput.hidden = true;
    shareLink.value = "";
    status.textContent = "";
    // An edited snapshot must not keep advertising its stale URL as the current board.
    if (location.hash.startsWith("#plan=")) history.replaceState(null, "", location.pathname + location.search);
    render();
  }
  form.addEventListener("submit", event => event.preventDefault());
  form.addEventListener("input", edited);
  form.addEventListener("change", edited);
  board.querySelector("[data-board-save]").addEventListener("click", () => {
    const state = render();
    if (!state) return;
    try {
      localStorage.setItem(STORAGE_KEY, encodeState(state));
      status.textContent = copy.saved;
    } catch { status.textContent = copy.storageFailed; }
  });
  board.querySelector("[data-board-share]").addEventListener("click", () => {
    const state = render();
    if (!state) return;
    const url = new URL(location.pathname, location.origin);
    url.hash = encodeState(state);
    shareLink.value = url.href;
    shareOutput.hidden = false;
    status.textContent = copy.sharedReady;
  });
  board.querySelector("[data-board-copy]").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(shareLink.value);
      status.textContent = copy.copied;
    } catch {
      shareLink.focus();
      shareLink.select();
      status.textContent = copy.copyFailed;
    }
  });
  board.querySelector("[data-board-reset]").addEventListener("click", () => {
    if (!window.confirm(copy.resetConfirm)) return;
    write(defaultState());
    edited();
    try {
      localStorage.removeItem(STORAGE_KEY);
      status.textContent = copy.cleared;
    } catch { status.textContent = copy.storageFailed; }
  });
  function load() {
    let initial = defaultState();
    let message = "";
    if (location.hash.startsWith("#plan=")) {
      try { initial = decodeState(location.hash); message = copy.sharedLoaded; }
      catch { message = copy.invalidShare; }
    } else {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) { initial = decodeState(saved); message = copy.restored; }
      } catch { message = copy.invalidSaved; }
    }
    write(initial);
    synchronizePicks();
    shareOutput.hidden = true;
    shareLink.value = "";
    render();
    status.textContent = message;
  }
  load();
  window.addEventListener("hashchange", load);
  form.hidden = false;
}
