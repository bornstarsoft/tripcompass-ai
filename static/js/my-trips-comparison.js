import { decodeState, STORAGE_KEY } from "./decision-core.js";

export function mountSavedComparison(doc, win) {
  const section = doc.querySelector("[data-saved-comparison]");
  if (!section) return;
  const cities = section.querySelector("[data-comparison-cities]");
  const labels = JSON.parse(cities.dataset.cityLabels);

  function render() {
    // Read only: the decision board remains the sole writer of its saved snapshot.
    try {
      const state = decodeState(win.localStorage.getItem(STORAGE_KEY));
      cities.textContent = state.options.map(option => labels[option.city]).join(" / ");
      section.hidden = false;
    } catch {
      cities.textContent = "";
      section.hidden = true;
    }
  }

  render();
  win.addEventListener("pageshow", render);
  win.addEventListener("storage", event => {
    if (event.key === STORAGE_KEY || event.key === null) render();
  });
}

if (typeof document !== "undefined") mountSavedComparison(document, window);
