// src/play.ts
// Pointip-Free — 플레이 창 (오버레이)

import { getCurrentWindow } from "@tauri-apps/api/window";

const API_BASE = "http://127.0.0.1:3000";

// ============================================================
// 재미있는 로딩 메시지
// ============================================================
const LOADING_AFTER_LOCAL = [
  "지니가 좀 더 살펴보는 중...",
  "지니가 서재에서 책 찾는 중...",
  "지니가 볼펜을 잃어버려서 찾는 중...",
  "지니가 다이루크에게 물어보는 중...",
  "지니가 잠깐 졸다가 깨는 중...",
  "지니가 커피 한 모금 마시는 중...",
  "지니가 옛 기록을 뒤적이는 중...",
  "지니가 몬드까지 다녀오는 중...",
  "지니가 별자리를 읽는 중...",
  "지니가 원소의 흐름을 보는 중...",
  "지니가 잠시 명상 중...",
  "지니가 고민 끝에 입을 여는 중...",
  "지니가 잊고 있던 걸 떠올리는 중...",
  "지니가 폰타인의 물소리를 듣는 중...",
  "지니가 티바트 지도를 펼치는 중...",
  "지니가 리월 항구에서 배를 기다리는 중...",
  "지니가 수메르 숲에서 버섯 채집 중...",
  "지니가 나타의 모래바람을 피하는 중...",
  "지니가 뇌물을 받고 잠깐 딴생각 중...",
  "지니가 원석을 세봤는데 하나가 부족한 중...",
  "지니가 성유물 옵션을 보고 한숨 쉬는 중...",
  "지니가 치치를 뽑고 우는 중...",
  "지니가 5성이 나왔는데 각청인 걸 확인 중...",
  "지니가 파티 조합 고민하다 잠깐 멍 때리는 중...",
  "지니가 나선비경 12층에서 좌절하는 중...",
  "지니가 향릉을 또 데려갈지 고민 중...",
  "지니가 벤티의 술 냄새를 참는 중...",
  "지니가 종려님께 조언을 구하는 중...",
  "지니가 라이덴의 번개를 피하는 중...",
  "지니가 나히다의 설명을 필기 중...",
  "지니가 푸리나의 연기를 관람 중...",
  "지니가 무알라니의 지혜를 빌리는 중...",
  "지니가 페이몬에게 밥을 사주는 중...",
  "지니가 여행자님 지갑을 걱정하는 중...",
  "지니가 오늘의 숙제를 몰래 미루는 중...",
  "지니가 가챠 확률표를 다시 읽는 중...",
  "지니가 어제 먹은 떡볶이를 생각하는 중...",
  "지니가 잠깐 폰 보고 오는 중...",
  "지니가 답변 초안을 세 번 갈아엎는 중...",
  "지니가 마지막 문장을 다듬는 중...",
];

const LOADING_NO_LOCAL = [
  "지니가 생각 중...",
  "지니가 처음 보는 질문에 고민 중...",
  "지니가 자료를 모으는 중...",
  "지니가 위키를 뒤지는 중...",
  "지니가 계산기 두드리는 중...",
  "지니가 잠시 딴생각하다 돌아오는 중...",
  "지니가 답을 찾아 떠나는 중...",
];

function pickRandom(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ============================================================
// API 헬퍼
// ============================================================
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

// ============================================================
// HTML 이스케이프
// ============================================================
function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ============================================================
// 1. 대시보드
// ============================================================
async function loadDashboard() {
  const briefingList = document.getElementById("briefing-list")!;
  const tasksList = document.getElementById("tasks-list")!;
  const parseCount = document.getElementById("parse-count")!;

  try {
    const account = Number(localStorage.getItem("current_account") || "1");
    const data = await apiGet(`/dashboard?account=${account}`);

    if (!data.ok) {
      briefingList.innerHTML = `<li class="error">${data.message || "데이터 없음"}</li>`;
      tasksList.innerHTML = `<div class="error">데이터 새로고침이 필요합니다.</div>`;
      return;
    }

    parseCount.textContent = `${data.parse.count}/${data.parse.max}`;

    briefingList.innerHTML = "";
    for (const line of data.briefing) {
      const li = document.createElement("li");
      li.textContent = line;
      briefingList.appendChild(li);
    }

    tasksList.innerHTML = "";
    data.tasks.forEach((task: any, idx: number) => {
      const card = document.createElement("div");
      card.className = "task-card";
      card.innerHTML = `
        <div class="task-num">${idx + 1}</div>
        <div class="task-body">
          <div class="task-title">${escapeHtml(task.title)}</div>
          <div class="task-detail">${escapeHtml(task.detail)}</div>
          <div class="task-estimate">${escapeHtml(task.estimate)}</div>
        </div>
      `;
      tasksList.appendChild(card);
    });
  } catch (e: any) {
    briefingList.innerHTML = `<li class="error">서버 연결 실패</li>`;
    tasksList.innerHTML = `<div class="error">API 서버가 꺼져있습니다.</div>`;
  }
}

// ============================================================
// 2. 대화
// ============================================================
function appendChat(role: "user" | "genie", text: string) {
  const log = document.getElementById("chat-log")!;
  const el = document.createElement("div");
  el.className = `chat-msg ${role}`;
  el.innerHTML = `<div class="chat-bubble">${escapeHtml(text)}</div>`;
  log.appendChild(el);
  log.scrollTop = log.scrollHeight;
}

async function sendChat(mode: "quick" | "ai" = "quick") {
  const input = document.getElementById("chat-input") as HTMLInputElement;
  const text = input.value.trim();
  if (!text) return;

  input.value = "";
  appendChat("user", text);

  // 버튼 비활성화
  const btnQuick = document.getElementById("btn-quick") as HTMLButtonElement;
  const btnAi = document.getElementById("btn-ai") as HTMLButtonElement;
  btnQuick.disabled = true;
  btnAi.disabled = true;

  const start = Date.now();

  // 로딩 메시지
  const loading = document.createElement("div");
  loading.className = "chat-msg genie";
  loading.innerHTML = `<div class="chat-bubble loading">${pickRandom(LOADING_NO_LOCAL)}</div>`;
  document.getElementById("chat-log")!.appendChild(loading);
  document.getElementById("chat-log")!.scrollTop = 99999;

  try {
    if (mode === "quick") {
      // ⚡ 간단 빨리: 로컬 브레인 + 템플릿
      const localRes = await apiPost("/chat/local", { input: text });
      loading.remove();

      if (localRes.ok && localRes.local) {
        appendChat("genie", localRes.local);
      }

      const llmRes = await apiPost("/chat/llm", {
        input: text,
        localAnswer: localRes.local || "",
      });
      if (llmRes.ok && llmRes.llm) {
        appendChat("genie", llmRes.llm);
      }
    } else {
      // 🧠 AI 상세: LLM
      const res = await apiPost("/chat/ai", { input: text });
      loading.remove();

      if (res.ok && res.answer) {
        appendChat("genie", res.answer);
      } else {
        appendChat("genie", res.message || "AI 답변을 받지 못했어요.");
      }
    }
  } catch (e: any) {
    loading.remove();
    appendChat("genie", `에러: ${e.message}`);
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(2);
  console.log(`[${mode}] ${elapsed}초`);

  btnQuick.disabled = false;
  btnAi.disabled = false;

  loadSuggestions();
}

// ============================================================
// 3. 동적 추천 질문
// ============================================================
async function loadSuggestions() {
  const el = document.getElementById("suggestions")!;
  try {
    const res = await apiGet("/chat/suggestions");
    if (!res.ok) return;

    el.innerHTML = "";
    for (const s of res.suggestions) {
      const btn = document.createElement("button");
      btn.className = "suggestion-btn";
      btn.textContent = s;
      btn.addEventListener("click", () => {
        // 입력창에 질문 넣고 간단 빨리 실행
        const input = document.getElementById("chat-input") as HTMLInputElement;
        if (input) input.value = s;
        sendChat("quick");
      });
      el.appendChild(btn);
    }
  } catch {}
}

// ============================================================
// 4. 오버레이 컨트롤 (투명도, 항상 위, 닫기, 드래그)
// ============================================================
async function setupOverlayControls() {
  const appWindow = getCurrentWindow();

  // 최초: 항상 위 + 테두리 없음
  try {
    await appWindow.setAlwaysOnTop(true);
  } catch {}
  try {
    await appWindow.setDecorations(false);
  } catch {}

  // === 투명도 순환 ===
  const opacityLevels = [0.95, 0.75, 0.55, 0.35];
  let opacityIdx = 0;
  const savedOpacity = localStorage.getItem("play_opacity");
  if (savedOpacity) {
    const v = parseFloat(savedOpacity);
    const idx = opacityLevels.indexOf(v);
    if (idx >= 0) {
      opacityIdx = idx;
      document.documentElement.style.setProperty("--play-bg-alpha", String(v));
    }
  }

  document.getElementById("opacity-btn")?.addEventListener("click", () => {
    opacityIdx = (opacityIdx + 1) % opacityLevels.length;
    const v = opacityLevels[opacityIdx];
    document.documentElement.style.setProperty("--play-bg-alpha", String(v));
    localStorage.setItem("play_opacity", String(v));
  });

  // === 항상 위 토글 ===
  let pinned = true;
  const pinBtn = document.getElementById("pin-btn") as HTMLButtonElement;
  if (pinBtn) pinBtn.style.color = "var(--accent)";

  pinBtn?.addEventListener("click", async () => {
    pinned = !pinned;
    try {
      await appWindow.setAlwaysOnTop(pinned);
    } catch {}
    pinBtn.style.color = pinned ? "var(--accent)" : "var(--fg-dim)";
  });

  // === 닫기 ===
  document.getElementById("close-btn")?.addEventListener("click", async () => {
    try {
      await appWindow.close();
    } catch {}
  });

  // === 드래그 (상단 드래그 바) ===
  const dragBar = document.getElementById("drag-bar");
  dragBar?.addEventListener("mousedown", async (e) => {
    const target = e.target as HTMLElement;
    if (target.closest(".overlay-controls")) return;
    try {
      await appWindow.startDragging();
    } catch (err) {
      console.error("startDragging 실패:", err);
    }
  });
}

// ============================================================
// 초기화
// ============================================================
window.addEventListener("DOMContentLoaded", () => {
  loadDashboard();
  loadSuggestions();
  setupOverlayControls();

  // ⚡ 간단 빨리
  document
    .getElementById("btn-quick")
    ?.addEventListener("click", () => sendChat("quick"));

  // 🧠 AI 상세
  document
    .getElementById("btn-ai")
    ?.addEventListener("click", () => sendChat("ai"));

  // Enter = 간단 빨리 / Shift+Enter = AI 상세
  document.getElementById("chat-input")?.addEventListener("keydown", (e) => {
    if ((e as KeyboardEvent).key === "Enter") {
      if ((e as KeyboardEvent).shiftKey) {
        sendChat("ai");
      } else {
        sendChat("quick");
      }
    }
  });

  appendChat("genie", "안녕하세요, 여행자님. 오늘 무엇을 도와드릴까요?");
});

e.exports = {
  chatLocal,
  chatLLM,
  chatAI, // ← 이게 있는지 확인
  getSuggestions,
  refreshContext,
  buildSystemPrompt,
};
