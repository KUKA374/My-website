"use strict";
const { Fault } = require("./errors.cjs"),
  { schema, prompt } = require("./content.cjs");
const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/";
function usage(value) {
  if (!value || typeof value !== "object") return null;
  const names = [
    "promptTokenCount",
    "candidatesTokenCount",
    "totalTokenCount",
    "cachedContentTokenCount",
    "thoughtsTokenCount",
  ];
  const out = {};
  for (const k of names)
    if (Number.isSafeInteger(value[k]) && value[k] >= 0 && value[k] <= 10000000)
      out[k] = value[k];
  return Object.hasOwn(out, "totalTokenCount") ? out : null;
}
async function boundedJSON(response) {
  if (!response.body)
    throw new Fault(502, "PROVIDER_FORMAT", "Gemini бос жауап қайтарды.");
  const reader = response.body.getReader();
  let size = 0;
  const chunks = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 1024 * 1024)
        throw new Fault(
          502,
          "PROVIDER_SIZE",
          "Gemini жауабының көлемі шектен асты.",
        );
      chunks.push(Buffer.from(value));
    }
  } catch (e) {
    await reader.cancel().catch(() => {});
    throw e;
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new Fault(502, "PROVIDER_FORMAT", "Gemini JSON жауабы оқылмады.");
  }
}
function gemini({ key, model, fetcher = globalThis.fetch, timeout = 75000 }) {
  if (
    !key ||
    !/^[a-zA-Z0-9_-]{10,200}$/.test(key) ||
    !/^gemini-[a-z0-9._-]{1,75}$/.test(model || "")
  )
    throw new Fault(
      503,
      "CONFIG_MISSING",
      "Серверде GEMINI_API_KEY және қолжетімді GEMINI_MODEL бапталуы қажет.",
    );
  return async (catalog) => {
    let data;
    try {
      const response = await fetcher(ENDPOINT + model + ":generateContent", {
        method: "POST",
        redirect: "error",
        headers: { "content-type": "application/json", "x-goog-api-key": key },
        signal: AbortSignal.timeout(timeout),
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt(catalog) }] }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: schema,
            candidateCount: 1,
            temperature: 0.25,
            maxOutputTokens: 24576,
          },
        }),
      });
      // Never expose the raw provider error, URL query, credentials or response text.
      if (!response.ok) {
        await response.body?.cancel().catch(() => {});
        throw new Fault(
          response.status === 429 ? 429 : 502,
          "PROVIDER_UNAVAILABLE",
          response.status === 429
            ? "Gemini квотасы уақытша таусылды. Кейінірек көріңіз."
            : "Gemini сұрауы орындалмады. Сервер баптауын тексеріңіз.",
        );
      }
      data = await boundedJSON(response);
    } catch (e) {
      if (e instanceof Fault) throw e;
      throw new Fault(
        502,
        "PROVIDER_NETWORK",
        "Gemini желісі немесе уақыт шегі қолжетімсіз. Сұрау қайта жіберілген жоқ.",
      );
    }
    const measured = usage(data.usageMetadata),
      candidate = data.candidates?.[0];
    if (!candidate || candidate.finishReason !== "STOP")
      throw new Fault(
        502,
        "PROVIDER_INCOMPLETE",
        "Gemini толық емес не бұғатталған жауап қайтарды. Жоба сақталмады.",
        measured,
      );
    const parts = candidate.content?.parts;
    if (
      !Array.isArray(parts) ||
      !parts.length ||
      parts.some((p) => typeof p.text !== "string" || p.thought === true)
    )
      throw new Fault(
        502,
        "PROVIDER_FORMAT",
        "Gemini мазмұн пішімі жарамсыз.",
        measured,
      );
    let content;
    try {
      content = JSON.parse(parts.map((p) => p.text).join(""));
    } catch {
      throw new Fault(
        502,
        "PROVIDER_FORMAT",
        "Gemini құрылымды JSON қайтармады.",
        measured,
      );
    }
    return { content, usage: measured, source: "gemini", model };
  };
}
module.exports = { gemini, usage, ENDPOINT };
