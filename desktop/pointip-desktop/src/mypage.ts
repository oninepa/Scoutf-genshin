// src/mypage.ts
// Pointip-Free — 마이페이지 (로그인 계정 설정)

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
  if (type !== "info") {
    setTimeout(() => {
      el.className = "status-box";
      el.textContent = "";
    }, 3000);
  }
}

async function loadProfile() {
  const me = await apiGet("/auth/me");
  if (!me.ok) {
    status("로그인 정보 없음", "error");
    return;
  }

  document.getElementById("my-email")!.textContent = me.user?.email || "-";
  (document.getElementById("my-nickname") as HTMLInputElement).value =
    me.profile?.nickname || "";
  document.getElementById("my-tier")!.textContent = me.profile?.tier || "free";
}

async function saveProfile() {
  const nickname = (
    document.getElementById("my-nickname") as HTMLInputElement
  ).value.trim();

  const res = await apiPost("/auth/profile/update", { nickname });
  if (res.ok) {
    status("저장 완료", "success");
  } else {
    status("저장 실패: " + (res.message || ""), "error");
  }
}

window.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("my-save-btn")
    ?.addEventListener("click", saveProfile);

  document.getElementById("my-nickname")?.addEventListener("keydown", (e) => {
    if ((e as KeyboardEvent).key === "Enter") saveProfile();
  });

  loadProfile();
});
