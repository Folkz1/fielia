#!/usr/bin/env node
// Validacao da mecanica do LLM Lab: prova que a chamada REST ao OpenRouter
// com usage:{include:true} retorna content + tokens + CUSTO REAL + latencia.
// Uso: node scripts/validate-llm-eval.mjs
import path from "node:path";
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const KEY = process.env.OPENROUTER_API_KEY;
if (!KEY) {
  console.error("OPENROUTER_API_KEY ausente (rode com --env-file=.env.local)");
  process.exit(1);
}
console.log("OPENROUTER_API_KEY presente:", Boolean(KEY), "\n");

const models = process.argv.slice(2);
const list = models.length ? models : ["x-ai/grok-4.1-fast", "google/gemini-2.0-flash-exp:free"];

async function call(model) {
  const start = Date.now();
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${KEY}`,
        "Content-Type": "application/json",
        "X-Title": "FielIA LLM Lab Validate",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "Em que ano o Corinthians foi fundado? Responda curto." }],
        temperature: 0.3,
        max_tokens: 80,
        usage: { include: true },
      }),
    });
    const latencyMs = Date.now() - start;
    const data = await res.json();
    if (!res.ok) {
      console.log(`  ${model}: HTTP ${res.status} -> ${data?.error?.message || "erro"}`);
      return;
    }
    const content = (data?.choices?.[0]?.message?.content || "").replace(/\n/g, " ").slice(0, 80);
    const u = data?.usage || {};
    console.log(`  ${model}`);
    console.log(`    latencia : ${latencyMs} ms`);
    console.log(`    content  : ${content}`);
    console.log(`    tokens   : total=${u.total_tokens} (prompt=${u.prompt_tokens}, completion=${u.completion_tokens})`);
    console.log(`    cost     : ${typeof u.cost === "number" ? "$" + u.cost : "(campo ausente!)"}`);
    console.log("");
  } catch (e) {
    console.log(`  ${model}: EXCEPTION ${e.message}`);
  }
}

for (const m of list) {
  await call(m);
}
