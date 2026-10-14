(() => {
  const tools = document.querySelector("[data-course-tools]");
  if (!tools) return;
  const copyButton = tools.querySelector("[data-course-copy]");
  const printButton = tools.querySelector("[data-course-print]");
  const status = tools.querySelector("[data-course-status]");
  const manual = tools.querySelector("[data-course-manual]");
  const link = tools.querySelector("[data-course-link]");
  const ko = document.documentElement.lang === "ko";
  let canonical;
  try {
    const url = new URL(tools.dataset.canonicalUrl);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) return;
    // Share the published page, never incoming query parameters or browser state.
    url.search = "";
    url.hash = "";
    canonical = url.href;
  } catch { return; }

  copyButton.addEventListener("click", async () => {
    if (copyButton.disabled) return;
    copyButton.disabled = true;
    status.textContent = "";
    try {
      await navigator.clipboard.writeText(canonical);
      manual.hidden = true;
      status.textContent = ko ? "링크를 복사했습니다." : "Link copied.";
    } catch {
      manual.hidden = false;
      link.value = canonical;
      link.focus();
      link.select();
      status.textContent = ko ? "자동 복사를 사용할 수 없습니다." : "Automatic copying is unavailable.";
    } finally {
      copyButton.disabled = false;
    }
  });

  printButton.hidden = typeof window.print !== "function";
  printButton.addEventListener("click", () => {
    status.textContent = "";
    try { window.print(); }
    catch {
      status.textContent = ko ? "인쇄 창을 열지 못했습니다." : "Print preview could not open.";
    }
  });
  tools.hidden = false;
})();
