// src/main.ts
// Pointip-Free — 홈 화면 (계정별 완전 독립 페이지)

import { WebviewWindow } from "@tauri-apps/api/webviewWindow";

const API_BASE = "http://127.0.0.1:3000";

let currentTab = Number(localStorage.getItem("current_account") || "1");
let accounts: any[] = [];

// ============================================================
// 라벨
// ============================================================
const LEVEL_LABEL: any = {
  beginner: "초급",
  intermediate: "중급",
  advanced: "고급",
};

const SPENDING_LABEL: any = {
  none: "무과금",
  light: "소과금 (공월+기행)",
  medium: "중과금",
  heavy: "핵과금",
};

const STYLE_LABEL: any = {
  story: "스토리",
  collection: "캐릭터 수집",
  resource: "자원 수집",
  abyss: "나선비경",
  theater: "환상극",
  leyline: "지맥 제압전",
  realm: "선계",
  seaborn: "별바다 세계",
};

const AI_LABEL: any = {
  detail: "자세히",
  normal: "보통",
  simple: "간단",
};

const PLAY_LABEL: any = {
  solo: "혼자",
  multi: "다중",
};

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
// HTML 이스케이프
// ============================================================
function escapeHtml(s: string) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ============================================================
// 새 창 열기
// ============================================================
async function openWindow(label: string, url: string, title: string) {
  const existing = await WebviewWindow.getByLabel(label);
  if (existing) {
    await existing.setFocus();
    return;
  }
  new WebviewWindow(label, {
    url,
    title,
    width: 600,
    height: 700,
    resizable: true,
    center: true,
  });
}

// ============================================================
// 탭 렌더링
// ============================================================
function renderTabs() {
  const section = document.getElementById("tabs-section")!;
  const el = document.getElementById("account-tabs")!;
  el.innerHTML = "";

  // 계정 2가 없으면 탭 숨김
  const hasAccount2 = accounts[1]?.uid;
  if (!hasAccount2) {
    section.style.display = "none";
    if (currentTab !== 1) {
      currentTab = 1;
      localStorage.setItem("current_account", "1");
    }
    return;
  }

  section.style.display = "block";

  accounts.forEach((acc, idx) => {
    const n = idx + 1;
    if (!acc.uid) return;

    const label = acc.name || acc.uid || `계정 ${n}`;
    const active = n === currentTab ? " active" : "";

    const btn = document.createElement("button");
    btn.className = "tab" + active;
    btn.textContent = label;
    btn.addEventListener("click", async () => {
      if (currentTab === n) return;
      currentTab = n;
      localStorage.setItem("current_account", String(n));
      renderTabs();
      await renderPage();
    });
    el.appendChild(btn);
  });
}

// ============================================================
// 계정 페이지 (완전 렌더)
// ============================================================
async function renderPage() {
  const el = document.getElementById("account-page")!;
  const acc = accounts[currentTab - 1];

  if (!acc) {
    el.innerHTML = `<div class="loading-page">계정 정보가 없습니다.</div>`;
    return;
  }

  // 프로필 로드
  let prof: any = { user: {}, ai: {} };
  try {
    const res = await apiGet(`/profile?account=${currentTab}`);
    if (res.ok) prof = res.profile;
  } catch {}

  const u = prof.user || {};
  const a = prof.ai || {};

  const stylesList = (u.styles || [])
    .map((s: string) => STYLE_LABEL[s] || s)
    .join(", ");

  const playModeList = (u.playMode || [])
    .map((m: string) => PLAY_LABEL[m] || m)
    .join(", ");

  el.innerHTML = `
    <div class="acc-section">
      <div class="acc-header">
        <div class="acc-name">${escapeHtml(acc.name || `계정 ${currentTab}`)}</div>
        <div class="acc-uid">UID ${escapeHtml(acc.uid || "미설정")}</div>
        <div class="acc-server">${acc.server ? escapeHtml(acc.server.name) : ""}</div>
      </div>
    </div>

    <div class="acc-section">
      <div class="acc-section-title">프로필</div>
      <div class="prof-grid">
        <div class="prof-row">
          <span class="prof-label">수준</span>
          <span class="prof-value">${LEVEL_LABEL[u.level] || "중급"}</span>
        </div>
        <div class="prof-row">
          <span class="prof-label">플레이</span>
          <span class="prof-value">${playModeList || "혼자"}</span>
        </div>
        <div class="prof-row">
          <span class="prof-label">관심</span>
          <span class="prof-value">${stylesList || "미설정"}</span>
        </div>
        <div class="prof-row">
          <span class="prof-label">과금</span>
          <span class="prof-value">${SPENDING_LABEL[u.spending] || "무과금"}</span>
        </div>
        <div class="prof-row">
          <span class="prof-label">답변</span>
          <span class="prof-value">${AI_LABEL[a.answerStyle] || "보통"}</span>
        </div>
      </div>
    </div>

    <div class="acc-section">
      <div class="acc-section-title">계정 상태</div>
      <div class="prof-row">
        <span class="prof-label">쿠키</span>
        <span class="prof-value">${acc.hasCookie ? "✅ 정상" : "⚠️ 없음"}</span>
      </div>
    </div>

    <div class="acc-actions">
      <button id="profile-btn" class="mini-btn">프로필 편집</button>
      <button id="cookie-btn" class="mini-btn">쿠키 설정</button>
      <button id="parse-btn" class="mini-btn">데이터 새로고침</button>
    </div>

    <button id="run-btn" class="run-btn">▶ 이 계정으로 실행</button>
  `;

  // 이벤트 바인딩
  document.getElementById("profile-btn")?.addEventListener("click", () => {
    openWindow("profile", `profile.html?account=${currentTab}`, "프로필 편집");
  });

  document
    .getElementById("cookie-btn")
    ?.addEventListener("click", openCookieModal);

  document.getElementById("parse-btn")?.addEventListener("click", runParse);

  document.getElementById("run-btn")?.addEventListener("click", runChat);
}

// ============================================================
// 데이터 새로고침
// ============================================================
async function runParse() {
  const btn = document.getElementById("parse-btn") as HTMLButtonElement;
  if (!btn) return;
  btn.disabled = true;
  btn.textContent = "새로고침 중...";
  try {
    const res = await apiPost("/parse", { account: currentTab });
    if (res.ok) {
      alert(`새로고침 완료 (${res.count}/${res.max})`);
    } else {
      alert(res.message || "새로고침 실패");
    }
  } catch (e: any) {
    alert("새로고침 실패: " + e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "데이터 새로고침";
  }
}

// ============================================================
// 실행
// ============================================================
async function runChat() {
  const acc = accounts[currentTab - 1];
  if (!acc?.uid) {
    alert("프로필 편집에서 UID를 먼저 설정하세요.");
    return;
  }
  if (!acc.hasCookie) {
    alert("쿠키가 없습니다. 쿠키 설정에서 입력하세요.");
    return;
  }
  localStorage.setItem("current_account", String(currentTab));
  await openWindow("play", "play.html", "Pointip-Free · 플레이");
}

// ============================================================
// 쿠키 모달
// ============================================================
async function openCookieModal() {
  const acc = accounts[currentTab - 1];
  const cookieRes = await apiGet(`/accounts/${currentTab}/cookie`);
  const cookie = cookieRes.cookie || "";
  const ltoken = cookie.match(/ltoken_v2=([^;]+)/)?.[1] || "";
  const ltuid = cookie.match(/ltuid_v2=([^;]+)/)?.[1] || "";

  (document.getElementById("cookie-ltoken") as HTMLInputElement).value = ltoken;
  (document.getElementById("cookie-ltuid") as HTMLInputElement).value = ltuid;

  document.getElementById("cookie-modal")?.classList.remove("hidden");
}

async function saveCookie() {
  const ltoken = (
    document.getElementById("cookie-ltoken") as HTMLInputElement
  ).value.trim();
  const ltuid = (
    document.getElementById("cookie-ltuid") as HTMLInputElement
  ).value.trim();

  if (!ltoken || !ltuid) {
    alert("두 값을 모두 입력하세요.");
    return;
  }

  const cookie = `ltoken_v2=${ltoken}; ltuid_v2=${ltuid};`;
  await apiPost(`/accounts/${currentTab}`, { cookie });

  document.getElementById("cookie-modal")?.classList.add("hidden");
  await loadAccounts();
  await renderPage();
}

// ============================================================
// 데이터 로드
// ============================================================
async function loadAccounts() {
  const res = await apiGet("/accounts");
  if (res.ok) accounts = res.accounts;
}

// ============================================================
// 초기화
// ============================================================
window.addEventListener("DOMContentLoaded", async () => {
  // 로그인 체크
  try {
    const auth = await apiGet("/auth/status");
    if (!auth.session) {
      window.location.href = "/login.html";
      return;
    }
  } catch {}

  await loadAccounts();
  renderTabs();
  await renderPage();

  // 쿠키 모달 이벤트
  document
    .getElementById("cookie-save-btn")
    ?.addEventListener("click", saveCookie);
  document
    .getElementById("cookie-cancel-btn")
    ?.addEventListener("click", () => {
      document.getElementById("cookie-modal")?.classList.add("hidden");
    });

  // 푸터 링크
  document.getElementById("discord-link")?.addEventListener("click", (e) => {
    e.preventDefault();
    alert("Discord 초대 링크는 추후 공개 예정입니다.");
  });
  document.getElementById("policy-link")?.addEventListener("click", (e) => {
    e.preventDefault();
    alert("정책 페이지는 추후 공개 예정입니다.");
  });
  document.getElementById("oss-link")?.addEventListener("click", (e) => {
    e.preventDefault();
    alert("오픈소스 정보는 추후 공개 예정입니다.");
  });
});
