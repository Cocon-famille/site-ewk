(async function () {
  const params = new URLSearchParams(location.search);
  const coursId = params.get("cours") || "decouverte";
  const doc = document.getElementById("fp-doc");

  document.getElementById("print-btn").addEventListener("click", () => window.print());

  let cours;
  try {
    const all = await EWK.fetchJSON("cours.json");
    cours = all.find((c) => c.id === coursId);
    if (!cours) throw new Error("introuvable");
  } catch (e) {
    doc.innerHTML = "<p>Ce cours est introuvable.</p>";
    return;
  }

  document.title = `Fiche prof — ${cours.titre}`;

  function el(html) {
    const div = document.createElement("div");
    div.innerHTML = html.trim();
    return div.firstElementChild;
  }

  function section(html) {
    doc.appendChild(el(`<section class="fp-section">${html}</section>`));
  }

  section(`
    <div class="fp-head">
      <span class="disc disc--small" aria-hidden="true"></span>
      <div>
        <div class="fp-head-title">${cours.titre}</div>
        <div class="fp-head-matiere">${cours.matiere} &middot; Fiche prof</div>
      </div>
    </div>
  `);

  cours.slides.forEach((slide) => {
    if (slide.type === "title" || slide.type === "end") return;

    if (slide.type === "info" || slide.type === "transition") {
      section(`<h2>${slide.title}</h2><p>${slide.body}</p>`);
      return;
    }

    if (slide.type === "list" || slide.type === "rules") {
      section(`<h2>${slide.title}</h2><ol>${slide.items.map((it) => `<li>${it}</li>`).join("")}</ol>`);
      return;
    }

    if (slide.type === "visual") {
      const items = slide.items.map((it) => (it.label ? `${it.big} (${it.label})` : it.big)).join(" &middot; ");
      section(`<h2>${slide.title}</h2><p>${items}</p>`);
      return;
    }

    if (slide.type === "badges") {
      section(
        `<h2>${slide.title}</h2><ul>${slide.items.map((it) => `<li><strong>${it.big}</strong> &mdash; ${it.label}</li>`).join("")}</ul>`
      );
      return;
    }

    if (slide.type === "quiz") {
      const correct = slide.options.find((o) => o.correct);
      section(`
        <p class="fp-q"><strong>Contrôle &mdash;</strong> ${slide.question}</p>
        <p class="fp-a">Réponse : ${correct ? correct.text : "?"}</p>
      `);
      return;
    }
  });
})();
