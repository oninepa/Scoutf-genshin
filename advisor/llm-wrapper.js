// advisor/llm-wrapper.js
// Pointip-Free — 통합 LLM 인터페이스 V6
// 우선순위 (mode: "auto"): Groq → OpenRouter → (Ollama 옵션)

const fs = require("fs");
const path = require("path");

const CONFIG_PATH = path.join(__dirname, "config.json");

// ============================================================
// 설정 로드
// ============================================================
function loadConfig() {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
    return JSON.parse(raw);
  } catch (e) {
    console.warn("⚠️ config.json 로드 실패. 기본값 사용.");
    return {
      mode: "auto",
      openrouter: { apiKey: "", preferredModels: [] },
      groq: { apiKey: "" },
      ollama: { model: "", host: "" },
      custom: { provider: "openai-compat", apiKey: "", baseUrl: "", model: "" },
    };
  }
}

// ============================================================
// API 키 접두사로 provider 자동 감지
// ============================================================
function detectApiProvider(apiKey, explicit) {
  if (explicit) return explicit;
  if (!apiKey) return "unknown";
  if (apiKey.startsWith("gsk_")) return "groq";
  if (apiKey.startsWith("xai-")) return "xai";
  if (apiKey.startsWith("sk-or-")) return "openrouter";
  return "openai-compat";
}

const PROVIDER_DEFAULTS = {
  groq: {
    baseUrl: "https://api.groq.com/openai/v1",
    model: "openai/gpt-oss-20b",
    label: "Groq (초고속, 무료)",
  },
  xai: {
    baseUrl: "https://api.x.ai/v1",
    model: "grok-3-mini",
    label: "xAI Grok (유료)",
  },
  "openai-compat": { baseUrl: "", model: "", label: "OpenAI 호환" },
};

// ============================================================
// OpenRouter 무료 모델
// ============================================================
async function listOpenRouterFreeModels(apiKey) {
  const url = "https://openrouter.ai/api/v1/models";
  const headers = {};
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const res = await fetch(url, { headers });
  if (!res.ok)
    throw new Error(`OpenRouter 모델 목록 조회 실패 (HTTP ${res.status})`);
  const json = await res.json();
  const models = json.data || [];

  const freeModels = models.filter(
    (m) =>
      typeof m.id === "string" &&
      m.id.endsWith(":free") &&
      m.pricing &&
      parseFloat(m.pricing.prompt || "0") === 0 &&
      parseFloat(m.pricing.completion || "0") === 0,
  );

  return freeModels.map((m) => ({
    id: m.id,
    name: m.name || m.id,
    contextLength: m.context_length || 0,
    description: m.description || "",
  }));
}

function isReasoningModel(modelId) {
  return /reasoning|thinking|r1|o1|o3/i.test(modelId);
}

function isSizedInRange(modelId) {
  if (isReasoningModel(modelId)) return false;
  const m = modelId.match(/(\d+(?:\.\d+)?)b/i);
  if (!m) return false;
  const size = parseFloat(m[1]);
  return size >= 3 && size <= 31;
}

async function getOpenRouterCandidates(apiKey, preferredModels = []) {
  const freeModels = await listOpenRouterFreeModels(apiKey);
  if (freeModels.length === 0) return [];

  const filtered = freeModels.filter((m) => !isReasoningModel(m.id));
  if (filtered.length === 0) return [];

  const candidates = [];
  for (const p of preferredModels) {
    const found = filtered.find((m) => m.id === p);
    if (found && !candidates.includes(found.id)) candidates.push(found.id);
  }

  const sized = filtered
    .filter((m) => isSizedInRange(m.id))
    .sort((a, b) => b.contextLength - a.contextLength);
  for (const m of sized) if (!candidates.includes(m.id)) candidates.push(m.id);

  const rest = filtered
    .filter((m) => !candidates.includes(m.id))
    .sort((a, b) => b.contextLength - a.contextLength);
  for (const m of rest) if (!candidates.includes(m.id)) candidates.push(m.id);

  return candidates;
}

async function callOpenRouter(messages, opts, onChunk = null) {
  if (!opts.apiKey) throw new Error("OpenRouter API 키가 없습니다.");
  if (!opts.model) throw new Error("OpenRouter 모델이 지정되지 않았습니다.");

  const url = "https://openrouter.ai/api/v1/chat/completions";
  const body = { model: opts.model, messages, temperature: 0.75 };
  if (onChunk) body.stream = true;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${opts.apiKey}`,
      "HTTP-Referer": "https://github.com/pointip-free",
      "X-Title": "Pointip-Free",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    const err = new Error(
      `OpenRouter HTTP ${res.status}: ${errText.slice(0, 300)}`,
    );
    err.status = res.status;
    throw err;
  }

  if (onChunk) return await readOpenAIStream(res, onChunk);
  const json = await res.json();
  return json.choices?.[0]?.message?.content || "";
}

async function callOpenRouterWithFallback(
  messages,
  apiKey,
  preferredModels,
  onChunk = null,
) {
  const candidates = await getOpenRouterCandidates(apiKey, preferredModels);
  if (candidates.length === 0)
    throw new Error("OpenRouter에서 사용 가능한 무료 모델을 찾을 수 없습니다.");

  let lastErr = null;
  let chunkWritten = false;

  const wrappedOnChunk = onChunk
    ? (chunk) => {
        chunkWritten = true;
        onChunk(chunk);
      }
    : null;

  for (let i = 0; i < candidates.length; i++) {
    const model = candidates[i];
    try {
      if (i > 0) console.warn(`   → 폴백 시도: ${model}`);
      else console.log(`   → 모델: ${model}`);

      let localChunkWritten = false;
      const localOnChunk = wrappedOnChunk
        ? (chunk) => {
            localChunkWritten = true;
            wrappedOnChunk(chunk);
          }
        : null;

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => {
          if (localChunkWritten) return;
          reject(new Error("TIMEOUT_15S"));
        }, 15000),
      );

      return await Promise.race([
        callOpenRouter(messages, { apiKey, model }, localOnChunk),
        timeoutPromise,
      ]);
    } catch (e) {
      lastErr = e;
      if (chunkWritten) {
        console.warn("   (이미 응답 시작됨. 폴백 중단)");
        throw e;
      }
      const retryable =
        [429, 503, 404, 402].includes(e.status) || e.message === "TIMEOUT_15S";
      if (!retryable) throw e;
      console.warn(
        `   ⚠️ ${model} 실패 (${e.status || e.message}). 다음 모델로...`,
      );
    }
  }

  throw new Error(
    `모든 OpenRouter 무료 모델 실패. 마지막 오류: ${lastErr?.message}`,
  );
}

// ============================================================
// Fast API — Groq / xAI
// ============================================================
async function chatFast(messages, opts, onChunk = null) {
  if (!opts.apiKey) throw new Error("Fast API 키가 없습니다.");

  const provider = detectApiProvider(opts.apiKey, opts.provider);
  const def = PROVIDER_DEFAULTS[provider] || PROVIDER_DEFAULTS["openai-compat"];
  const baseUrl = opts.baseUrl || def.baseUrl;
  const model = opts.model || def.model;

  if (!baseUrl) throw new Error(`${provider} baseUrl이 없습니다.`);
  if (!model) throw new Error(`${provider} 모델이 없습니다.`);

  const url = `${baseUrl.replace(/\/$/, "")}/chat/completions`;
  const body = { model, messages, temperature: 0.75 };
  if (onChunk) body.stream = true;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${opts.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    const err = new Error(
      `${provider} HTTP ${res.status}: ${errText.slice(0, 300)}`,
    );
    err.status = res.status;
    throw err;
  }

  if (onChunk) return await readOpenAIStream(res, onChunk);
  const json = await res.json();
  return json.choices?.[0]?.message?.content || "";
}

async function callFastWithTimeout(messages, opts, onChunk = null) {
  if (!opts.apiKey) throw new Error("Fast API 키가 없습니다.");

  let chunkWritten = false;
  const localOnChunk = onChunk
    ? (chunk) => {
        chunkWritten = true;
        onChunk(chunk);
      }
    : null;

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => {
      if (chunkWritten) return;
      reject(new Error("TIMEOUT_20S"));
    }, 20000),
  );

  return await Promise.race([
    chatFast(messages, opts, localOnChunk),
    timeoutPromise,
  ]);
}

// ============================================================
// 공통 스트림 리더
// ============================================================
async function readOpenAIStream(res, onChunk) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      if (data === "[DONE]") continue;
      try {
        const json = JSON.parse(data);
        const chunk = json.choices?.[0]?.delta?.content || "";
        if (chunk) {
          full += chunk;
          onChunk(chunk);
        }
      } catch (e) {}
    }
  }
  return full;
}

// ============================================================
// Ollama (설정된 경우만)
// ============================================================
async function chatOllama(messages, opts, onChunk = null) {
  const ollama = require("ollama").default;
  const model = opts.model || "qwen2.5:7b";

  if (onChunk) {
    const stream = await ollama.chat({
      model,
      messages,
      stream: true,
      options: { temperature: 0.75 },
    });
    let full = "";
    for await (const part of stream) {
      const chunk = part.message?.content || "";
      if (chunk) {
        full += chunk;
        onChunk(chunk);
      }
    }
    return full;
  }

  const res = await ollama.chat({
    model,
    messages,
    options: { temperature: 0.75 },
  });
  return res.message.content;
}

// ============================================================
// 커스텀 (OpenAI 호환)
// ============================================================
async function chatCustom(messages, opts, onChunk = null) {
  if (!opts.apiKey) throw new Error("커스텀 API 키가 없습니다.");
  if (!opts.baseUrl) throw new Error("커스텀 baseUrl이 없습니다.");
  if (!opts.model) throw new Error("커스텀 모델이 없습니다.");

  const url = `${opts.baseUrl.replace(/\/$/, "")}/chat/completions`;
  const body = { model: opts.model, messages, temperature: 0.75 };
  if (onChunk) body.stream = true;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${opts.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`커스텀 API HTTP ${res.status}: ${errText.slice(0, 300)}`);
  }

  if (onChunk) return await readOpenAIStream(res, onChunk);
  const json = await res.json();
  return json.choices?.[0]?.message?.content || "";
}

// ============================================================
// Gemini (호환)
// ============================================================
async function listGeminiModels(apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`모델 목록 조회 실패 (HTTP ${res.status})`);
  const json = await res.json();
  if (!json.models || !Array.isArray(json.models)) return [];
  return json.models
    .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
    .map((m) => ({
      name: m.name.replace("models/", ""),
      displayName: m.displayName || "",
    }));
}

async function chatGemini(messages, opts) {
  if (!opts.apiKey) throw new Error("Gemini API 키가 없습니다.");
  const systemMsg = messages.find((m) => m.role === "system");
  const chatMsgs = messages.filter((m) => m.role !== "system");
  const contents = chatMsgs.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  const body = { contents };
  if (systemMsg)
    body.systemInstruction = { parts: [{ text: systemMsg.content }] };

  const model = opts.model || "gemini-flash-lite-latest";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${opts.apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini HTTP ${res.status}: ${errText.slice(0, 300)}`);
  }
  const json = await res.json();
  return json.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

// ============================================================
// 통합 — 일반 호출
// ============================================================
async function chat(messages, configOverride = {}) {
  const config = { ...loadConfig(), ...configOverride };
  const mode = config.mode || "auto";

  if (mode === "auto") {
    // 1순위: Fast API (Groq)
    if (config.groq?.apiKey) {
      try {
        const provider = detectApiProvider(config.groq.apiKey);
        const label = PROVIDER_DEFAULTS[provider]?.label || provider;
        console.log(`⚡ ${label} 시도...`);
        return await callFastWithTimeout(messages, config.groq);
      } catch (e) {
        console.warn(`   ⚠️ Fast API 실패: ${e.message}`);
        console.warn("   → OpenRouter로 폴백...");
      }
    }

    // 2순위: OpenRouter
    if (config.openrouter?.apiKey) {
      try {
        console.log("🌐 OpenRouter 시도...");
        return await callOpenRouterWithFallback(
          messages,
          config.openrouter.apiKey,
          config.openrouter.preferredModels || [],
        );
      } catch (e) {
        console.warn(`   ⚠️ OpenRouter 실패: ${e.message}`);
      }
    }

    // 3순위: Ollama (설정된 경우만)
    if (config.ollama?.model && config.ollama?.host) {
      try {
        console.log("🖥️  Ollama 로컬 시도...");
        return await chatOllama(messages, config.ollama);
      } catch (e) {
        console.warn(`   ⚠️ Ollama 실패: ${e.message}`);
      }
    }

    return "[LLM 없음] Groq 또는 OpenRouter를 설정하세요.";
  }

  if (mode === "openrouter") {
    return await callOpenRouterWithFallback(
      messages,
      config.openrouter.apiKey,
      config.openrouter.preferredModels || [],
    );
  }

  if (mode === "fast" || mode === "groq" || mode === "xai") {
    return await callFastWithTimeout(messages, config.groq);
  }

  if (mode === "ollama") {
    return await chatOllama(messages, config.ollama);
  }

  if (mode === "custom") {
    if (config.custom?.provider === "gemini")
      return await chatGemini(messages, config.custom);
    return await chatCustom(messages, config.custom);
  }

  if (mode === "none") {
    return "[LLM 비활성화] 템플릿 답변만 사용 가능합니다.";
  }

  throw new Error(`알 수 없는 mode: ${mode}`);
}

// ============================================================
// 통합 — 스트리밍 호출
// ============================================================
async function chatStream(messages, onChunk, configOverride = {}) {
  const config = { ...loadConfig(), ...configOverride };
  const mode = config.mode || "auto";

  if (mode === "auto") {
    // 1순위: Fast API (Groq)
    if (config.groq?.apiKey) {
      try {
        const provider = detectApiProvider(config.groq.apiKey);
        const label = PROVIDER_DEFAULTS[provider]?.label || provider;
        console.log(`⚡ ${label} 스트리밍...`);
        return await callFastWithTimeout(messages, config.groq, onChunk);
      } catch (e) {
        console.warn(`   ⚠️ Fast API 실패: ${e.message}`);
        console.warn("   → OpenRouter로 폴백...");
      }
    }

    // 2순위: OpenRouter
    if (config.openrouter?.apiKey) {
      try {
        console.log("🌐 OpenRouter 스트리밍...");
        return await callOpenRouterWithFallback(
          messages,
          config.openrouter.apiKey,
          config.openrouter.preferredModels || [],
          onChunk,
        );
      } catch (e) {
        console.warn(`   ⚠️ OpenRouter 실패: ${e.message}`);
      }
    }

    // 3순위: Ollama (설정된 경우만)
    if (config.ollama?.model && config.ollama?.host) {
      try {
        console.log("🖥️  Ollama 로컬 스트리밍...");
        return await chatOllama(messages, config.ollama, onChunk);
      } catch (e) {
        console.warn(`   ⚠️ Ollama 실패: ${e.message}`);
      }
    }

    const msg = "[LLM 없음] Groq 또는 OpenRouter를 설정하세요.";
    onChunk(msg);
    return msg;
  }

  if (mode === "openrouter") {
    return await callOpenRouterWithFallback(
      messages,
      config.openrouter.apiKey,
      config.openrouter.preferredModels || [],
      onChunk,
    );
  }

  if (mode === "fast" || mode === "groq" || mode === "xai") {
    return await callFastWithTimeout(messages, config.groq, onChunk);
  }

  if (mode === "ollama") {
    return await chatOllama(messages, config.ollama, onChunk);
  }

  if (mode === "custom") {
    if (config.custom?.provider === "gemini") {
      const full = await chatGemini(messages, config.custom);
      await fakeStream(full, onChunk);
      return full;
    }
    return await chatCustom(messages, config.custom, onChunk);
  }

  if (mode === "none") {
    const msg = "[LLM 비활성화] 템플릿 답변만 사용 가능합니다.";
    onChunk(msg);
    return msg;
  }

  throw new Error(`알 수 없는 mode: ${mode}`);
}

async function fakeStream(text, onChunk) {
  const chars = [...text];
  const chunkSize = 3;
  for (let i = 0; i < chars.length; i += chunkSize) {
    onChunk(chars.slice(i, i + chunkSize).join(""));
    await new Promise((r) => setTimeout(r, 15));
  }
}

// ============================================================
// 유틸
// ============================================================
async function printGeminiModels(apiKey) {
  const models = await listGeminiModels(apiKey);
  console.log(`\n📋 Gemini 모델 (${models.length}개):\n`);
  models.forEach((m) => console.log(`  ${m.name.padEnd(40)} ${m.displayName}`));
}

async function printOpenRouterFreeModels(apiKey) {
  const models = await listOpenRouterFreeModels(apiKey);
  console.log(`\n📋 OpenRouter 무료 모델 (${models.length}개):\n`);
  models.forEach((m) => {
    const reason = isReasoningModel(m.id) ? "🧠" : "  ";
    const sized = isSizedInRange(m.id) ? "⭐" : "  ";
    console.log(`${reason}${sized} ${m.id.padEnd(55)} ctx:${m.contextLength}`);
  });
  console.log("\n⭐ = 3~31B (권장) / 🧠 = 추론 모델 (자동 제외)\n");
}

// ============================================================
// Export
// ============================================================
module.exports = {
  chat,
  chatStream,
  loadConfig,
  listOpenRouterFreeModels,
  getOpenRouterCandidates,
  callOpenRouterWithFallback,
  printOpenRouterFreeModels,
  isSizedInRange,
  isReasoningModel,
  chatFast,
  callFastWithTimeout,
  detectApiProvider,
  PROVIDER_DEFAULTS,
  listGeminiModels,
  printGeminiModels,
  chatOllama,
  chatCustom,
  chatGemini,
  fakeStream,
};
