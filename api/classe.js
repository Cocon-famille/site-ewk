const REPO = "Cocon-famille/site-ewk";
const FILE_API = `https://api.github.com/repos/${REPO}/contents/data/classe.json`;
const NIVEAUX = ["IE1", "IE2", "IE3", "IE4", "IE5"];

function clean(value, maxLen) {
  return typeof value === "string" ? value.trim().slice(0, maxLen) : "";
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Méthode non autorisée." });
    return;
  }

  const token = process.env.CLASSE_GITHUB_TOKEN;
  if (!token) {
    res.status(500).json({ error: "Le serveur n'est pas configuré (jeton manquant)." });
    return;
  }

  const body = req.body || {};
  const nom = clean(body.nom, 100);
  const prenom = clean(body.prenom, 100);
  const naissance = clean(body.naissance, 20);
  const niveau = clean(body.niveau, 10);
  const responsable = clean(body.responsable, 150);
  const contact = clean(body.contact, 150);
  const info = clean(body.info, 500);

  if (!nom || !prenom || !naissance || !NIVEAUX.includes(niveau)) {
    res.status(400).json({ error: "Merci de remplir au moins le nom, le prénom, la date de naissance et le niveau." });
    return;
  }

  const ghHeaders = { Authorization: `token ${token}`, Accept: "application/vnd.github+json" };

  try {
    const getRes = await fetch(FILE_API, { headers: ghHeaders });
    if (!getRes.ok) throw new Error(`Lecture de la liste : HTTP ${getRes.status}`);
    const file = await getRes.json();
    const current = JSON.parse(Buffer.from(file.content, "base64").toString("utf-8"));

    current.push({
      id: String(Date.now()),
      nom,
      prenom,
      naissance,
      niveau,
      responsable: responsable || null,
      contact: contact || null,
      info: info || null,
    });

    const putRes = await fetch(FILE_API, {
      method: "PUT",
      headers: { ...ghHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `Inscription en ligne : ${prenom} ${nom}`,
        content: Buffer.from(JSON.stringify(current, null, 2) + "\n", "utf-8").toString("base64"),
        sha: file.sha,
        branch: "main",
      }),
    });
    if (!putRes.ok) {
      const err = await putRes.json().catch(() => ({}));
      throw new Error(err.message || `Écriture de la liste : HTTP ${putRes.status}`);
    }

    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(502).json({ error: e.message || "Erreur serveur." });
  }
};
