(async function () {
  const badgesEl = document.getElementById("eleve-badges");
  const bulletinsEl = document.getElementById("eleve-bulletins");
  const fichesEl = document.getElementById("eleve-fiches");

  function badgeItem(disc, label, earned) {
    const li = document.createElement("li");
    li.className = "badge" + (earned ? "" : " badge--locked");
    li.innerHTML = `${disc}<span class="badge-label">${label}</span>`;
    return li;
  }

  try {
    const fiches = await EWK.fetchJSON("fiches.json");
    const badges = EWK.computeBadges(fiches);

    badgesEl.innerHTML = "";
    badgesEl.appendChild(badgeItem('<span class="badge-disc badge-disc--outline">1</span>', badges.premier.label, badges.premier.earned));
    badgesEl.appendChild(badgeItem('<span class="badge-disc badge-disc--outline">5</span>', badges.habitue.label, badges.habitue.earned));
    badgesEl.appendChild(badgeItem('<span class="badge-disc badge-disc--orange">10</span>', badges.palier.label, badges.palier.earned));
    badgesEl.appendChild(badgeItem('<span class="badge-disc badge-disc--ink">JUSTE</span>', badges.juste.label, badges.juste.earned));
    badgesEl.appendChild(badgeItem('<span class="badge-disc badge-disc--dashed">?</span>', badges.question.label, badges.question.earned));

    fichesEl.innerHTML = "";
    if (!fiches.length) {
      fichesEl.innerHTML = '<p class="section-lede">Pas encore de cours.</p>';
    } else {
      [...fiches].reverse().forEach((f) => fichesEl.appendChild(EWK.fiche(f)));
    }
  } catch (e) {
    badgesEl.innerHTML = "";
    fichesEl.innerHTML = '<p class="section-lede">Impossible de charger les cours pour le moment.</p>';
  }

  try {
    const bulletins = await EWK.fetchJSON("bulletins.json");
    bulletinsEl.innerHTML = "";
    if (!bulletins.length) {
      bulletinsEl.innerHTML = '<p class="section-lede">Pas encore de bulletin. Le premier arrive bientôt.</p>';
    } else {
      [...bulletins].reverse().forEach((b) => bulletinsEl.appendChild(bulletinCard(b)));
    }
  } catch (e) {
    bulletinsEl.innerHTML = '<p class="section-lede">Bulletins indisponibles pour le moment.</p>';
  }

  function bulletinCard(b) {
    const el = document.createElement("div");
    el.className = "bulletin-card";
    el.innerHTML = `
      <div class="bulletin-card-head">
        <span class="disc disc--small" aria-hidden="true"></span>
        <div>
          <div class="bulletin-card-title">Bulletin &mdash; ${b.periode}</div>
          <div class="bulletin-card-matieres">${(b.matieres || []).join(" · ")}</div>
        </div>
      </div>
      ${b.points_forts ? `<p class="bulletin-points">${b.points_forts}</p>` : ""}
      ${(b.badges || []).length ? `<div class="bulletin-badges">${b.badges.map((x) => `<span class="pill">${x}</span>`).join(" ")}</div>` : ""}
      ${b.mot ? `<p class="bulletin-mot">&laquo;&nbsp;${b.mot}&nbsp;&raquo;</p>` : ""}
      ${b.attachment ? `<a class="link-arrow" href="${b.attachment}" target="_blank" rel="noopener">Voir le bulletin en PDF &rarr;</a>` : ""}
    `;
    return el;
  }
})();
