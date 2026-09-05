(function () {
  var el = document.getElementById("open-status");
  if (!el) return;

  var day = new Date().getDay(); // 0 = dimanche, 6 = samedi
  var isWeekend = day === 0 || day === 6;

  el.dataset.open = String(isWeekend);
  el.textContent = isWeekend
    ? "École ouverte aujourd'hui."
    : "Prochaine ouverture : samedi.";
})();
