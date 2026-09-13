(function () {
  const SLIDES = [
    {
      type: "title",
      eyebrow: "EWK &middot; Premier cours",
      title: "Bienvenue à<br>L'École du Weekend",
      sub: "Aujourd'hui, on découvre comment ça marche.",
    },
    {
      type: "info",
      title: "C'est quoi, cette école ?",
      body: "Une école qui ouvre deux jours par semaine. Avec Maël. Juste pour toi.",
    },
    {
      type: "rules",
      title: "Le règlement, en 4 points",
      items: [
        "C'est toi qui décides s'il y a cours.",
        "Jamais plus de 20 minutes.",
        "Aucune question n'est bête.",
        "Jamais de devoirs.",
      ],
    },
    {
      type: "badges",
      title: "Les badges",
      body: "Après chaque cours, tu gagnes un badge. Regarde :",
    },
    {
      type: "info",
      title: "Semaine A, semaine B",
      body: "Chaque semaine a un nom&nbsp;: A ou B. Ça change ce qu'on apprend, comme au collège.",
    },
    {
      type: "transition",
      title: "Prêt pour un petit contrôle ?",
      body: "Juste pour voir si tu as bien écouté. Pas grave si tu te trompes.",
    },
    {
      type: "quiz",
      question: "Combien de jours l'école est ouverte ?",
      options: [{ text: "2", correct: true }, { text: "5" }, { text: "7" }],
    },
    {
      type: "quiz",
      question: "Qui décide s'il y a cours ?",
      options: [{ text: "Toi", correct: true }, { text: "Maël" }, { text: "Personne" }],
    },
    {
      type: "quiz",
      question: "Tu as le droit de poser une question bête ?",
      options: [{ text: "Oui", correct: true }, { text: "Non" }],
    },
    {
      type: "quiz",
      question: "Après un cours, tu gagnes...",
      options: [{ text: "Un devoir" }, { text: "Un badge", correct: true }, { text: "Une punition" }],
    },
    {
      type: "end",
      title: "Bravo !",
      body: "Tu as fini ton premier cours.",
    },
  ];

  let current = 0;
  const solved = new Set();

  const root = document.getElementById("diapo");
  const prevBtn = document.getElementById("diapo-prev");
  const nextBtn = document.getElementById("diapo-next");
  const counter = document.getElementById("diapo-counter");

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

  prevBtn.addEventListener("click", () => goTo(current - 1));
  nextBtn.addEventListener("click", () => goTo(current + 1));
  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight" && !nextBtn.disabled) goTo(current + 1);
    if (e.key === "ArrowLeft" && !prevBtn.disabled) goTo(current - 1);
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
    if (slide.type === "rules") {
      return `
        <h1 class="diapo-title">${slide.title}</h1>
        <ol class="diapo-rules">${slide.items.map((it) => `<li>${it}</li>`).join("")}</ol>`;
    }
    if (slide.type === "badges") {
      return `
        <h1 class="diapo-title">${slide.title}</h1>
        <p class="diapo-sub">${slide.body}</p>
        <div class="diapo-badges">
          <span class="badge-disc badge-disc--outline diapo-badge-disc">1</span>
          <span class="badge-disc badge-disc--orange diapo-badge-disc">10</span>
          <span class="badge-disc badge-disc--ink diapo-badge-disc">JUSTE</span>
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
