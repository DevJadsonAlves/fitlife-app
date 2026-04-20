const MAX_IMAGE_BASE64_LENGTH = 8_000_000;
const MAX_EXERCISE_NAME_LENGTH = 120;

function parseBody(rawBody: unknown) {
  if (typeof rawBody === "string") {
    return JSON.parse(rawBody);
  }
  return rawBody;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: "Form Check indisponivel: servidor sem chave de IA." });
    return;
  }

  let body: any;
  try {
    body = parseBody(req.body);
  } catch {
    res.status(400).json({ error: "JSON invalido." });
    return;
  }

  const exerciseName = String(body?.exerciseName ?? "").trim();
  const imageBase64 = String(body?.imageBase64 ?? "").trim();

  if (!exerciseName || exerciseName.length > MAX_EXERCISE_NAME_LENGTH) {
    res.status(400).json({ error: "Nome do exercicio invalido." });
    return;
  }

  if (!imageBase64 || imageBase64.length > MAX_IMAGE_BASE64_LENGTH) {
    res.status(400).json({ error: "Imagem invalida ou muito grande." });
    return;
  }

  try {
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-latest",
        max_tokens: 700,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: "image/jpeg",
                  data: imageBase64,
                },
              },
              {
                type: "text",
                text:
                  "Voce e um personal trainer especialista em biomecanica. " +
                  `O usuario esta executando: ${exerciseName}. ` +
                  "Responda em portugues com feedback conciso (maximo 80 palavras): " +
                  "o que esta correto, o que ajustar e uma dica principal.",
              },
            ],
          },
        ],
      }),
    });

    const payload = await anthropicRes.json();
    if (!anthropicRes.ok) {
      res.status(502).json({ error: "Falha na analise da IA." });
      return;
    }

    const content = Array.isArray(payload?.content) ? payload.content : [];
    const feedback = content
      .map((entry: any) => (typeof entry?.text === "string" ? entry.text : ""))
      .join(" ")
      .trim();

    if (!feedback) {
      res.status(502).json({ error: "A IA nao retornou feedback valido." });
      return;
    }

    res.status(200).json({ feedback });
  } catch {
    res.status(500).json({ error: "Erro interno ao processar analise." });
  }
}
