(async function () {
  const statusEl = document.getElementById("semaine-status");
  const slot = document.getElementById("edt-slot");
  const current = EWK.currentSemaine();

  statusEl.dataset.open = "true";
  statusEl.textContent = `Cette semaine : Semaine ${current}`;

  try {
    const edt = await EWK.fetchJSON("edt.json");
    slot.innerHTML = "";
    slot.appendChild(edtTable(edt, current));
  } catch (e) {
    slot.innerHTML = '<p class="section-lede">Emploi du temps indisponible pour le moment.</p>';
  }

  function sorted(courses) {
    return [...(courses || [])].sort((a, b) => a.heure.localeCompare(b.heure));
  }

  function chips(courses) {
    if (!courses || !courses.length) return "&mdash;";
    return sorted(courses)
      .map((c) => {
        const col = EWK.COLORS[c.couleur] || EWK.COLORS.orange;
        return `<span class="edt-chip" style="background:${col.bg};color:${col.text}"><b>${c.heure}</b> ${c.matiere}</span>`;
      })
      .join("");
  }

  function edtTable(edt, current) {
    const table = document.createElement("table");
    table.className = "edt-table";
    table.innerHTML = `
      <thead>
        <tr>
          <th></th>
          <th>Samedi</th>
          <th>Dimanche</th>
        </tr>
      </thead>
      <tbody>
        <tr class="${current === "A" ? "edt-row--current" : ""}">
          <th>Semaine A</th>
          <td><div class="edt-chip-list">${chips(edt.A?.samedi)}</div></td>
          <td><div class="edt-chip-list">${chips(edt.A?.dimanche)}</div></td>
        </tr>
        <tr class="${current === "B" ? "edt-row--current" : ""}">
          <th>Semaine B</th>
          <td><div class="edt-chip-list">${chips(edt.B?.samedi)}</div></td>
          <td><div class="edt-chip-list">${chips(edt.B?.dimanche)}</div></td>
        </tr>
      </tbody>
    `;
    return table;
  }
})();
