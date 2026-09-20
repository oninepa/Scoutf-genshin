// src/llm-settings.ts
// Pointip-Free — LLM 설정 창 로직 (Groq + OpenRouter)

const API_BASE = "http://127.0.0.1:3000";

async function apiGet(path: string) {
  const res = await fetch(`${API_BASE}${path}`);
  return await res.json();
}
async function apiPost(path: string, body?: any) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return await res.json();
}

function status(msg: string, type: "info" | "error" | "success" = "info") {
  const el = document.getElementById("status")!;
  el.textContent = msg;
  el.className = "status-box " + type;
}

// ============================================================
// 눈 아이콘 토글
// ============================================================
function toggleVisibility(targetId: string) {
  const input = document.getElementById(targetId) as HTMLInputElement;
  if (!input) return;
  input.classList.toggle("masked");
}

// ============================================================
// 저장
// ============================================================
async function save() {
  const groqKey = (
    document.getElementById("groq-key") as HTMLInputElement
  ).value.trim();
  const orKey = (
    document.getElementById("or-key") as HTMLInputElement
  ).value.trim();

  if (!groqKey && !orKey) {
    status("Groq 또는 OpenRouter 중 하나 이상 입력하세요.", "error");
    return;
  }
  if (groqKey && !groqKey.startsWith("gsk_")) {
    status("Groq 키는 gsk_ 로 시작해야 합니다.", "error");
    return;
  }
  if (orKey && !orKey.startsWith("sk-or-")) {
    status("OpenRouter 키는 sk-or- 로 시작해야 합니다.", "error");
    return;
  }

  const body: any = { mode: "auto" };

  if (groqKey) {
    body.groq = {
      apiKey: groqKey,
      model: "openai/gpt-oss-20b",
      baseUrl: "https://api.groq.com/openai/v1",
    };
  } else {
    body.groq = { apiKey: "" };
  }

  if (orKey) {
    body.openrouter = {
      apiKey: orKey,
      preferredModels: [
        "cohere/north-mini-code:free",
        "google/gemma-4-26b-a4b-it:free",
      ],
    };
  } else {
    body.openrouter = { apiKey: "" };
  }

  try {
    const res = await apiPost("/config", body);
    if (res.ok) {
      status("저장 완료", "success");
    } else {
      status("저장 실패: " + (res.message || "알 수 없는 오류"), "error");
    }
  } catch (e: any) {
    status("서버 오류: " + e.message, "error");
  }
}

// ============================================================
// 로드
// ============================================================
async function load() {
  try {
    const res = await apiGet("/config");
    if (!res.ok) return;
    const c = res.config || {};

    if (c.groq?.apiKey) {
      (document.getElementById("groq-key") as HTMLInputElement).value =
        c.groq.apiKey;
    }
    if (c.openrouter?.apiKey) {
      (document.getElementById("or-key") as HTMLInputElement).value =
        c.openrouter.apiKey;
    }
  } catch {}
}

// ============================================================
// 초기화
// ============================================================
window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("save-btn")?.addEventListener("click", save);

  // 눈 아이콘
  document.querySelectorAll(".eye-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = (btn as HTMLElement).dataset.target;
      if (target) toggleVisibility(target);
    });
  });

  // X (지우기) 아이콘
  document.querySelectorAll(".clear-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = (btn as HTMLElement).dataset.target;
      if (target) {
        const input = document.getElementById(target) as HTMLInputElement;
        if (input) input.value = "";
      }
    });
  });

  load();
});
