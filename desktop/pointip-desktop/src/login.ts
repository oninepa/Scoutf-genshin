// src/login.ts
// Pointip-Free — 로그인 화면

const API_BASE = "http://127.0.0.1:3000";

let mode: "login" | "register" = "login";

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
// 제출
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
// 초기화
// ============================================================
window.addEventListener("DOMContentLoaded", async () => {
  // 세션 있으면 바로 홈으로
  try {
    const st = await apiGet("/auth/status");
    if (st.session) {
      window.location.href = "/index.html";
      return;
    }

    if (st.hasUser) {
      // 이미 사용자 있음 → 로그인 모드
      setMode("login");
      if (st.session?.email) {
        (document.getElementById("email-input") as HTMLInputElement).value =
          st.session.email;
      }
    } else {
      // 사용자 없음 → 회원가입 모드
      setMode("register");
    }
  } catch {
    status(
      "서버에 연결할 수 없습니다. server.js 실행 중인지 확인하세요.",
      "error",
    );
  }

  // 이벤트
  document
    .getElementById("tab-login")
    ?.addEventListener("click", () => setMode("login"));
  document
    .getElementById("tab-register")
    ?.addEventListener("click", () => setMode("register"));
  document.getElementById("submit-btn")?.addEventListener("click", submit);

  // Enter
  document
    .getElementById("password-input")
    ?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") submit();
    });
});
