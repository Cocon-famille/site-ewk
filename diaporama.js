(async function () {
  const params = new URLSearchParams(location.search);
  const coursId = params.get("cours") || "decouverte";

  const root = document.getElementById("diapo");
  const prevBtn = document.getElementById("diapo-prev");
  const nextBtn = document.getElementById("diapo-next");
  const counter = document.getElementById("diapo-counter");

  let SLIDES = [];
  try {
    const cours = await EWK.fetchJSON("cours.json");
    const found = cours.find((c) => c.id === coursId);
    if (!found) throw new Error("cours introuvable");
    document.title = `${found.titre} — L'École du Weekend`;
    SLIDES = found.slides;
  } catch (e) {
    root.innerHTML = '<p class="diapo-sub">Ce cours est introuvable.</p>';
    return;
  }

  let current = 0;
  const solved = new Set();

  function render() {
    const slide = SLIDES[current];
    root.className = "diapo diapo-slide--" + slide.type;
    root.innerHTML = html(slide);

    if (slide.type === "quiz") {
      root.querySelectorAll(".diapo-option").forEach((btn) => {
        btn.addEventListener("click", () => onAnswer(btn, slide));
      });
    }
    if (slide.type === "transition") {
      root.querySelector(".diapo-cta").addEventListener("click", () => goTo(current + 1));
    }
    if (slide.type === "end") {
      root.querySelector(".diapo-cta").addEventListener("click", () => goTo(0));
    }

    prevBtn.disabled = current === 0;
    counter.textContent = `${current + 1} / ${SLIDES.length}`;
    const locked = slide.type === "quiz" && !solved.has(current);
    nextBtn.disabled = locked || current === SLIDES.length - 1;
    nextBtn.style.visibility = current === SLIDES.length - 1 ? "hidden" : "visible";
  }

  function onAnswer(btn, slide) {
    const isCorrect = btn.dataset.correct === "true";
    root.querySelectorAll(".diapo-option").forEach((b) => b.classList.remove("is-right", "is-wrong"));
    if (isCorrect) {
      btn.classList.add("is-right");
      solved.add(current);
      root.querySelector(".diapo-feedback").textContent = "Juste !";
      root.querySelector(".diapo-feedback").className = "diapo-feedback diapo-feedback--right";
    } else {
      btn.classList.add("is-wrong");
      root.querySelector(".diapo-feedback").textContent = "Pas tout à fait, essaie encore.";
      root.querySelector(".diapo-feedback").className = "diapo-feedback diapo-feedback--wrong";
    }
    nextBtn.disabled = !solved.has(current);
  }

  function goTo(index) {
    if (index < 0 || index >= SLIDES.length) return;
    current = index;
    render();
  }

  function advance() {
    if (!nextBtn.disabled) goTo(current + 1);
  }

  prevBtn.addEventListener("click", () => goTo(current - 1));
  nextBtn.addEventListener("click", () => goTo(current + 1));

  // Cliquer n'importe où sur la diapo avance, sauf sur un bouton
  // (options du contrôle, boutons "C'est parti"/"Recommencer") qui
  // gère déjà son propre clic.
  root.addEventListener("click", (e) => {
    if (e.target.closest("button")) return;
    advance();
  });

  document.addEventListener("keydown", (e) => {
    const onButton = document.activeElement && document.activeElement.tagName === "BUTTON";
    if (e.key === "ArrowRight") advance();
    if (e.key === "ArrowLeft" && !prevBtn.disabled) goTo(current - 1);
    if ((e.key === " " || e.key === "Enter") && !onButton) {
      e.preventDefault();
      advance();
    }
  });

  function html(slide) {
    if (slide.type === "title") {
      return `
        <span class="disc diapo-logo" aria-hidden="true"></span>
        <p class="diapo-eyebrow">${slide.eyebrow}</p>
        <h1 class="diapo-title">${slide.title}</h1>
        <p class="diapo-sub">${slide.sub}</p>`;
    }
    if (slide.type === "info" || slide.type === "transition") {
      return `
        <h1 class="diapo-title">${slide.title}</h1>
        <p class="diapo-sub">${slide.body}</p>
        ${slide.type === "transition" ? '<button type="button" class="diapo-cta">C\'est parti !</button>' : ""}`;
    }
    if (slide.type === "list" || slide.type === "rules") {
      return `
        <h1 class="diapo-title">${slide.title}</h1>
        <ol class="diapo-rules">${slide.items.map((it) => `<li>${it}</li>`).join("")}</ol>`;
    }
    if (slide.type === "visual") {
      return `
        <h1 class="diapo-title">${slide.title}</h1>
        <div class="diapo-visual-grid">
          ${slide.items
            .map(
              (it) => `
            <div class="diapo-visual-card${it.highlight ? " diapo-visual-card--highlight" : ""}">
              <span class="diapo-visual-big">${it.big}</span>
              ${it.label ? `<span class="diapo-visual-label">${it.label}</span>` : ""}
            </div>`
            )
            .join("")}
        </div>`;
    }
    if (slide.type === "badges") {
      return `
        <h1 class="diapo-title">${slide.title}</h1>
        <p class="diapo-sub">${slide.body}</p>
        <div class="diapo-badges">
          ${slide.items
            .map(
              (it) => `
            <div class="diapo-badge-item">
              <span class="badge-disc ${it.cls} diapo-badge-disc">${it.big}</span>
              <span class="diapo-badge-label">${it.label}</span>
            </div>`
            )
            .join("")}
        </div>`;
    }
    if (slide.type === "quiz") {
      return `
        <p class="diapo-eyebrow">Petit contrôle</p>
        <h1 class="diapo-title diapo-title--question">${slide.question}</h1>
        <div class="diapo-options">
          ${slide.options
            .map((o) => `<button type="button" class="diapo-option" data-correct="${!!o.correct}">${o.text}</button>`)
            .join("")}
        </div>
        <p class="diapo-feedback"></p>`;
    }
    if (slide.type === "end") {
      return `
        <span class="badge-disc badge-disc--ink diapo-badge-disc diapo-badge-disc--big">JUSTE</span>
        <h1 class="diapo-title">${slide.title}</h1>
        <p class="diapo-sub">${slide.body}</p>
        <button type="button" class="diapo-cta">Recommencer</button>`;
    }
    return "";
  }

  render();
})();
