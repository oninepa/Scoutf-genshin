// src/login.ts
// Pointip-Free — 로그인 화면

import { openUrl } from "@tauri-apps/plugin-opener";

const API_BASE = "http://127.0.0.1:3000";

let mode: "login" | "register" = "login";
let polling: number | null = null;

// ============================================================
// API
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
// 상태 메시지
// ============================================================
function status(msg: string, type: "info" | "error" | "success" = "info") {
  const el = document.getElementById("login-status")!;
  el.textContent = msg;
  el.className = "login-status " + type;
}

// ============================================================
// 탭 전환
// ============================================================
function setMode(newMode: "login" | "register") {
  mode = newMode;
  const loginTab = document.getElementById("tab-login")!;
  const registerTab = document.getElementById("tab-register")!;
  const submitBtn = document.getElementById("submit-btn")!;

  loginTab.classList.toggle("active", mode === "login");
  registerTab.classList.toggle("active", mode === "register");
  submitBtn.textContent = mode === "login" ? "로그인" : "회원가입";
  status("");
}

// ============================================================
// 제출 (이메일/비밀번호)
// ============================================================
async function submit() {
  const email = (
    document.getElementById("email-input") as HTMLInputElement
  ).value.trim();
  const password = (
    document.getElementById("password-input") as HTMLInputElement
  ).value;

  if (!email || !password) {
    status("이메일과 비밀번호를 입력하세요.", "error");
    return;
  }

  const url = mode === "login" ? "/auth/login" : "/auth/register";
  const res = await apiPost(url, { email, password });

  if (res.ok) {
    status("성공! 이동 중...", "success");
    setTimeout(() => {
      window.location.href = "/index.html";
    }, 500);
  } else {
    status(res.message || "실패", "error");
  }
}

// ============================================================
// 구글 로그인
// ============================================================
async function googleLogin() {
  status("구글 로그인 중... 브라우저에서 완료해주세요.", "info");
  try {
    const res = await fetch(`${API_BASE}/auth/google/start`);
    const data = await res.json();
    if (data.ok && data.url) {
      await openUrl(data.url);
      status("브라우저에서 로그인 후 이 창으로 돌아오세요.", "info");
      startPolling();
    } else {
      status(data.message || "구글 로그인 실패", "error");
    }
  } catch (e: any) {
    status("오류: " + e.message, "error");
  }
}

// ============================================================
// 로그인 감지 폴링 (구글 로그인 완료 대기)
// ============================================================
function startPolling() {
  if (polling) return;
  polling = window.setInterval(async () => {
    try {
      const st = await apiGet("/auth/status");
      if (st.loggedIn) {
        if (polling) clearInterval(polling);
        status("로그인 완료! 이동 중...", "success");
        setTimeout(() => {
          window.location.href = "/index.html";
        }, 500);
      }
    } catch {}
  }, 2000);
}

// ============================================================
// 초기화
// ============================================================
window.addEventListener("DOMContentLoaded", async () => {
  // OAuth 해시 토큰 처리 (구글 로그인 후 이 창으로 돌아오면)
  if (window.location.hash && window.location.hash.includes("access_token")) {
    try {
      const params = new URLSearchParams(window.location.hash.substring(1));
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");
      const expires_at = params.get("expires_at");

      if (access_token) {
        status("로그인 처리 중...", "info");
        const res = await apiPost("/auth/google/session", {
          access_token,
          refresh_token,
          expires_at: expires_at ? parseInt(expires_at, 10) : 0,
        });
        if (res.ok) {
          window.location.href = "/index.html";
          return;
        } else {
          status(res.message || "세션 저장 실패", "error");
        }
      }
    } catch (e: any) {
      status("해시 처리 오류: " + e.message, "error");
    }
  }

  // 이미 로그인 됐으면 바로 홈
  try {
    const st = await apiGet("/auth/status");
    if (st.loggedIn) {
      window.location.href = "/index.html";
      return;
    }
  } catch {}

  setMode("login");

  document
    .getElementById("tab-login")
    ?.addEventListener("click", () => setMode("login"));
  document
    .getElementById("tab-register")
    ?.addEventListener("click", () => setMode("register"));
  document.getElementById("submit-btn")?.addEventListener("click", submit);

  document
    .getElementById("password-input")
    ?.addEventListener("keydown", (e) => {
      if ((e as KeyboardEvent).key === "Enter") submit();
    });

  document.getElementById("google-btn")?.addEventListener("click", googleLogin);
});
