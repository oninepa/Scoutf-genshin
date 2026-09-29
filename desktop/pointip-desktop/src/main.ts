// src/main.ts
// Pointip-Free — 홈 화면 (계정별 완전 독립 페이지)

import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { listen } from "@tauri-apps/api/event";

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
    // play 창은 항상 새로 (계정 전환용)
    if (label === "play") {
      await existing.close();
      await new Promise((r) => setTimeout(r, 500));
    } else {
      await existing.setFocus();
      return;
    }
  }

  const isPlay = label === "play";
  const isProfile = label.startsWith("profile-");

  // 프로필 창은 길게 (저장 버튼 보이도록)
  const width = isPlay ? 700 : isProfile ? 600 : 600;
  const height = isPlay ? 800 : isProfile ? 900 : 700;

  new WebviewWindow(label, {
    url,
    title,
    width,
    height,
    resizable: true,
    center: true,
    decorations: !isPlay,
    alwaysOnTop: isPlay,
    transparent: isPlay,
    minWidth: 400,
    minHeight: 500,
  });
}
// ============================================================
// 탭 렌더링
// ============================================================
function renderTabs() {
  const section = document.getElementById("tabs-section")!;
  const el = document.getElementById("account-tabs")!;
  el.innerHTML = "";

  // 등록된 계정 (uid 있는 것) 개수
  const usedCount = accounts.filter((a) => a.uid).length;

  // 0개면 섹션 숨김 (이론상 없음)
  if (usedCount === 0) {
    section.style.display = "none";
    return;
  }

  section.style.display = "block";

  // 등록된 계정 탭
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

  // "+" 버튼 (5개 미만일 때만)
  if (usedCount < accounts.length) {
    const addBtn = document.createElement("button");
    addBtn.className = "tab tab-add";
    addBtn.textContent = "+";
    addBtn.title = "계정 추가";
    addBtn.addEventListener("click", () => {
      // 빈 슬롯 찾기
      const emptyIdx = accounts.findIndex((a) => !a.uid);
      if (emptyIdx < 0) return;

      const n = emptyIdx + 1;
      currentTab = n;
      localStorage.setItem("current_account", String(n));
      renderTabs();
      renderPage();
    });
    el.appendChild(addBtn);
  }
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

  // 프로필 로드 (로컬 슬롯 index 기준)
  let prof: any = { user: {}, ai: {} };
  const localIndex = acc.index || currentTab;
  try {
    const res = await apiGet(`/profile?account=${localIndex}`);
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
            <button id="profile-btn" class="mini-btn">게임 프로필 편집</button>
      <button id="cookie-btn" class="mini-btn">쿠키 설정</button>
      <button id="parse-btn" class="mini-btn">데이터 새로고침</button>
    </div>

    <button id="run-btn" class="run-btn">▶ 이 계정으로 실행</button>
  `;

  // 이벤트 바인딩
  const localIdx = acc.index || currentTab;

  document.getElementById("profile-btn")?.addEventListener("click", () => {
    openWindow(
      `profile-${localIdx}`,
      `/profile.html?account=${localIdx}`,
      "게임 프로필 편집",
    );
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
  const acc = accounts[currentTab - 1];
  const localIdx = acc?.index || currentTab;
  btn.disabled = true;
  btn.textContent = "새로고침 중...";
  try {
    const res = await apiPost("/parse", { account: localIdx });
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
  // 로컬 슬롯 인덱스 저장 (play.ts가 이걸 씀)
  const localIdx = acc.index || currentTab;
  localStorage.setItem("current_account", String(localIdx));
  await openWindow("play", "play.html", "Pointip-Free · 플레이");
}

// ============================================================
// 쿠키 모달
// ============================================================
async function openCookieModal() {
  const acc = accounts[currentTab - 1];
  const localIdx = acc?.index || currentTab;
  const cookieRes = await apiGet(`/accounts/${localIdx}/cookie`);
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

  const acc = accounts[currentTab - 1];
  const localIdx = acc?.index || currentTab;
  const cookie = `ltoken_v2=${ltoken}; ltuid_v2=${ltuid};`;
  await apiPost(`/accounts/${localIdx}`, { cookie });

  document.getElementById("cookie-modal")?.classList.add("hidden");
  await loadAccounts();
  await renderPage();
}

// ============================================================
// 데이터 로드
// ============================================================
async function loadAccounts() {
  // Supabase UID 목록 + 로컬 쿠키 상태 매칭
  const [uidRes, localRes] = await Promise.all([
    apiGet("/auth/uids"),
    apiGet("/accounts"),
  ]);

  if (!uidRes.ok) {
    accounts = [];
    return;
  }

  const localList = localRes.accounts || [];

  // Supabase UID 기준으로 계정 재구성 (로컬 슬롯 매칭)
  accounts = uidRes.uids.map((su: any) => {
    // 로컬에서 같은 UID 찾기 (쿠키, 슬롯 인덱스)
    const local = localList.find((la: any) => la.uid === su.uid);
    return {
      uid: su.uid,
      name: su.nickname || "",
      server: su.server ? { name: su.server } : null,
      hasCookie: local?.hasCookie || false,
      index: local?.index || null, // 로컬 슬롯 (1~5)
    };
  });
}

// ============================================================
// 초기화
// ============================================================
window.addEventListener("DOMContentLoaded", async () => {
  // 로그인 체크
  try {
    const auth = await apiGet("/auth/status");
    if (!auth.loggedIn) {
      window.location.href = "/login.html";
      return;
    }
  } catch {}
  // 자식 창에서 계정 변경 시 탭 새로고침
  await listen("account-updated", async () => {
    console.log("[main] account-updated 수신!");
    await loadAccounts();
    console.log("[main] accounts:", JSON.stringify(accounts));
    renderTabs();
    await renderPage();
    console.log("[main] renderPage 완료");
  });
  await loadAccounts();
  renderTabs();
  await renderPage();
  // 사용자 아바타 로드
  (async () => {
    try {
      const me = await apiGet("/auth/me");
      if (me.ok && me.user && me.user.email) {
        const avatar = document.getElementById("user-avatar");
        if (avatar) {
          avatar.textContent = me.user.email[0].toUpperCase();
          avatar.style.display = "flex";
          avatar.addEventListener("click", () => {
            openWindow("mypage", "/mypage.html", "마이페이지");
          });
        }
      }
    } catch {}
  })();

  // 쿠키 모달 이벤트
  document
    .getElementById("cookie-save-btn")
    ?.addEventListener("click", saveCookie);
  document
    .getElementById("cookie-cancel-btn")
    ?.addEventListener("click", () => {
      document.getElementById("cookie-modal")?.classList.add("hidden");
    });
  // AI 연결 버튼
  document.getElementById("ai-connect-btn")?.addEventListener("click", () => {
    openWindow("llm-settings", "llm-settings.html", "AI 연결");
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
