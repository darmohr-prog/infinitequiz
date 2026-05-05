// app/api/generate/route.js
// ✅ La clé API Anthropic est lue depuis les variables d'environnement Vercel.
// Elle n'est JAMAIS envoyée au navigateur.

const LEVELS = [
  { id:1, label:"Débutant" },
  { id:2, label:"Intermédiaire" },
  { id:3, label:"Confirmé" },
  { id:4, label:"Avancé" },
  { id:5, label:"Expert" },
];

const LEVEL_DESC = [
  "très facile — notions vues en primaire ou à la télé (ex : capitale de la France, animal le plus grand du monde, planète rouge)",
  "facile — programme de collège 6e-5e, culture générale courante pour un ado (ex : dates clés simples, sciences de base, géographie courante)",
  "moyen — programme de 4e-3e, ado curieux et bon élève (ex : histoire moderne, géographie avancée, sciences du collège, œuvres au programme)",
  "difficile — ado passionné et lecteur, documentaires (ex : faits précis, personnages historiques moins connus, vocabulaire spécialisé accessible)",
  "très difficile — niveau lycée, ado brillant et très cultivé (ex : détails historiques, sciences avancées — mais toujours accessible à un jeune de 14 ans exceptionnellement curieux)",
];

export async function POST(request) {
  try {
    const { level, allKnown, category } = await request.json();

    // Validation basique
    if (!level || level < 1 || level > 5) {
      return Response.json({ error: "Niveau invalide" }, { status: 400 });
    }

    const levelLabel = LEVELS[level - 1].label;
    const usedList = (allKnown || [])
      .map((q, i) => `${i + 1}. ${q.q || q}`)
      .join("\n");

    const prompt = `Tu es un expert en quiz de culture générale pour collégiens. Génère UNE question pour un élève de 14 ans, niveau ${levelLabel} (${level}/5), dans la catégorie "${category}".

RÈGLES ABSOLUES :
1. PUBLIC : élève de 14 ans (classe de 3e). Le vocabulaire, les références et la complexité doivent être adaptés à cet âge.
2. NIVEAU ${level}/5 : ${LEVEL_DESC[level - 1]}
3. Formule la question de façon claire, directe, sans jargon d'adulte inaccessible.
4. 4 choix de réponse plausibles, UNE seule bonne réponse. Les mauvaises réponses doivent être crédibles mais clairement incorrectes.
5. Ta question DOIT être totalement différente de cette liste — aucun sujet commun, aucune reformulation :
${usedList || "(aucune question posée encore)"}
6. Explore un angle ou un fait INÉDIT, pas les classiques déjà listés ci-dessus.

Réponds UNIQUEMENT en JSON valide, sans markdown, sans texte autour :
{"q":"texte de la question","choices":["choix A","choix B","choix C","choix D"],"answer":INDEX_CORRECT,"category":"${category}","level":${level}}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Anthropic API error:", err);
      return Response.json({ error: "Erreur API Anthropic" }, { status: 502 });
    }

    const data = await response.json();
    const text = data.content?.find((b) => b.type === "text")?.text || "";
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    if (
      !parsed.q ||
      !Array.isArray(parsed.choices) ||
      parsed.choices.length !== 4 ||
      typeof parsed.answer !== "number"
    ) {
      return Response.json({ error: "Format invalide" }, { status: 500 });
    }

    return Response.json(parsed);
  } catch (err) {
    console.error("Route error:", err);
    return Response.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
