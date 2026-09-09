// Helpers shared by the public pages (index.html, eleve.html) for reading
// the site's data files. Admin writes are handled separately in admin.js.
window.EWK = window.EWK || {};

EWK.fetchJSON = async function (file) {
  const res = await fetch(`data/${file}?_=${Date.now()}`);
  if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
  return res.json();
};

EWK.computeBadges = function (fiches) {
  const justes = fiches.filter((f) => f.badge === "JUSTE").length;
  const questions = fiches.filter((f) => f.badge === "QUESTION").length;
  return {
    premier: { earned: fiches.length >= 1, label: "Premier cours" },
    habitue: { earned: fiches.length >= 5, label: "Habitué" },
    palier: { earned: fiches.length >= 10, label: "Palier orange" },
    juste: { earned: justes >= 1, label: "Exercice réussi seul" },
    question: { earned: questions >= 1, label: "A posé une colle au prof" },
  };
};

EWK.COLORS = {
  orange: { bg: "#E4572E", text: "#FFFDF8" },
  vert: { bg: "#0F8A5F", text: "#FFFDF8" },
  bleu: { bg: "#3B6E8F", text: "#FFFDF8" },
  violet: { bg: "#7A5C9E", text: "#FFFDF8" },
  jaune: { bg: "#D9A54A", text: "#14120F" },
  rose: { bg: "#B85C7A", text: "#FFFDF8" },
};

EWK.isoWeek = function (date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
};

EWK.currentSemaine = function (date) {
  return EWK.isoWeek(date || new Date()) % 2 === 0 ? "B" : "A";
};

EWK.fiche = function (f) {
  const el = document.createElement("div");
  el.className = "course-card";
  el.innerHTML = `
    <div class="course-card-head">
      <span class="disc disc--small" aria-hidden="true"></span>
      <span class="course-card-title">L'École du Weekend</span>
      <span class="course-card-ref">FICHE N&deg; ${String(f.id).padStart(3, "0")}</span>
    </div>
    <table class="course-table">
      <tbody>
        <tr><th>Date</th><td>${f.date}</td></tr>
        <tr><th>Matière</th><td>${f.matiere}</td></tr>
        <tr><th>Durée</th><td>${f.duree}</td></tr>
        <tr><th>Compris aujourd'hui</th><td>${f.compris}</td></tr>
        ${f.badge ? `<tr><th>Badge</th><td><span class="pill">${f.badge}</span></td></tr>` : ""}
      </tbody>
    </table>`;
  return el;
};
