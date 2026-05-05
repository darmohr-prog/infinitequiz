// app/api/generate/route.js
// La cle API Groq est lue depuis les variables d'environnement Vercel.
// Elle n'est JAMAIS envoyee au navigateur.

const LEVELS = [
  { id:1, label:"Debutant" },
  { id:2, label:"Intermediaire" },
  { id:3, label:"Confirme" },
  { id:4, label:"Avance" },
  { id:5, label:"Expert" },
];

const LEVEL_DESC = [
  "tres facile — notions vues en primaire ou a la tele (ex : capitale de la France, animal le plus grand du monde, planete rouge)",
  "facile — programme de college 6e-5e, culture generale courante pour un ado (ex : dates cles simples, sciences de base, geographie courante)",
  "moyen — programme de 4e-3e, ado curieux et bon eleve (ex : histoire moderne, geographie avancee, sciences du college, oeuvres au programme)",
  "difficile — ado passionne et lecteur, documentaires (ex : faits precis, personnages historiques moins connus, vocabulaire specialise accessible)",
  "tres difficile — niveau lycee, ado brillant et tres cultive (ex : details historiques, sciences avancees — mais toujours accessible a un jeune de 14 ans exceptionnellement curieux)",
];

export async function POST(request) {
  try {
    const { level, allKnown, category } = await request.json();

    if (!level || level < 1 || level > 5) {
      return Response.json({ error: "Niveau invalide" }, { status: 400 });
    }

    const levelLabel = LEVELS[level - 1].label;
    const usedList = (allKnown || [])
      .map((q, i) => `${i + 1}. ${q.q || q}`)
      .join("\n");

    const prompt = `Tu es un expert en quiz de culture generale pour collegiens. Genere UNE question pour un eleve de 14 ans, niveau ${levelLabel} (${level}/5), dans la categorie "${category}".

REGLES ABSOLUES :
1. PUBLIC : eleve de 14 ans (classe de 3e). Le vocabulaire, les references et la complexite doivent etre adaptes a cet age.
2. NIVEAU ${level}/5 : ${LEVEL_DESC[level - 1]}
3. Formule la question de facon claire, directe, sans jargon inaccessible.
4. 4 choix de reponse plausibles, UNE seule bonne reponse.
5. Ta question DOIT etre totalement differente de cette liste :
${usedList || "(aucune question posee encore)"}
6. Explore un angle ou un fait INEDIT.

Reponds UNIQUEMENT en JSON valide, sans markdown, sans texte autour :
{"q":"texte de la question","choices":["choix A","choix B","choix C","choix D"],"answer":INDEX_CORRECT,"category":"${category}","level":${level}}`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 512,
        temperature: 0.9,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Groq API error:", err);
      return Response.json({ error: "Erreur API Groq" }, { status: 502 });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";
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
