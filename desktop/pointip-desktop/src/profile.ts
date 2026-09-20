// src/profile.ts
// Pointip-Free — 프로필 편집 창 (계정별)

const API_BASE = "http://127.0.0.1:3000";

// URL 파라미터
const urlParams = new URLSearchParams(window.location.search);
const ACCOUNT_INDEX = Number(urlParams.get("account") || "1");

let accounts: any[] = [];

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

// ============================================================
// 서버 자동 감지
// ============================================================
function detectServer(uid: string) {
  if (!uid) return null;
  const map: any = {
    "1": "중국 (관복)",
    "5": "중국 (채널복)",
    "6": "미국",
    "7": "유럽",
    "8": "아시아",
    "9": "대만/홍콩/마카오",
  };
  return map[uid[0]] || null;
}

function onUidInput() {
  const uid = (
    document.getElementById("acc-uid") as HTMLInputElement
  ).value.trim();
  const el = document.getElementById("server-display")!;
  el.textContent = detectServer(uid) || "(자동 감지)";
}

// ============================================================
// 과금 힌트
// ============================================================
const SPENDING_HINTS: any = {
  none: "무과금: 모든 자원을 신중하게 사용하세요. 4성 위주 조합이 유리합니다.",
  light:
    "소과금: 공월+기행으로 원석을 꾸준히 모으세요. 픽업 선택이 중요합니다.",
  medium:
    "중과금: 원하는 캐릭터를 안정적으로 확보할 수 있습니다. 무기 픽업도 고려하세요.",
  heavy: "핵과금: 제약 없이 최적 조합을 만들 수 있습니다.",
};

function updateSpendingHint() {
  const val = (document.getElementById("spending-select") as HTMLSelectElement)
    .value;
  document.getElementById("spending-hint")!.textContent =
    SPENDING_HINTS[val] || "";
}

// ============================================================
// 체크박스 헬퍼
// ============================================================
function getChecked(name: string): string[] {
  const els = document.querySelectorAll(`input[name="${name}"]:checked`);
  return Array.from(els).map((el) => (el as HTMLInputElement).value);
}

function setChecked(name: string, values: string[]) {
  const els = document.querySelectorAll(`input[name="${name}"]`);
  els.forEach((el) => {
    const input = el as HTMLInputElement;
    input.checked = values.includes(input.value);
  });
}

// ============================================================
// 계정 저장 (현재 계정)
// ============================================================
async function saveAccount() {
  const name = (
    document.getElementById("acc-name") as HTMLInputElement
  ).value.trim();
  const uid = (
    document.getElementById("acc-uid") as HTMLInputElement
  ).value.trim();

  if (!/^\d{9}$/.test(uid)) {
    status("UID는 9자리 숫자입니다.", "error");
    return;
  }

  const res = await apiPost(`/accounts/${ACCOUNT_INDEX}`, { name, uid });
  if (res.ok) {
    status("계정 정보 저장 완료", "success");
    await loadAll();
  } else {
    status("저장 실패: " + (res.message || ""), "error");
  }
}

// ============================================================
// 프로필 저장
// ============================================================
async function saveProfile() {
  const body = {
    account: ACCOUNT_INDEX,
    user: {
      level: (document.getElementById("level-select") as HTMLSelectElement)
        .value,
      playMode: getChecked("playMode"),
      styles: getChecked("styles"),
      spending: (
        document.getElementById("spending-select") as HTMLSelectElement
      ).value,
    },
    ai: {
      answerStyle: (
        document.getElementById("answer-style-select") as HTMLSelectElement
      ).value,
    },
  };

  const res = await apiPost("/profile", body);
  if (res.ok) {
    status("프로필 저장 완료", "success");
  } else {
    status("저장 실패: " + (res.errors ? res.errors.join(", ") : ""), "error");
  }
}

// ============================================================
// 초기 로드
// ============================================================
async function loadAll() {
  // 계정 정보
  const accRes = await apiGet("/accounts");
  if (accRes.ok) accounts = accRes.accounts;

  const acc = accounts[ACCOUNT_INDEX - 1];
  if (acc) {
    (document.getElementById("acc-name") as HTMLInputElement).value =
      acc.name || "";
    (document.getElementById("acc-uid") as HTMLInputElement).value =
      acc.uid || "";
    onUidInput();
  }

  // 프로필
  const profRes = await apiGet(`/profile?account=${ACCOUNT_INDEX}`);
  if (profRes.ok && profRes.profile) {
    const p = profRes.profile;
    const u = p.user || {};
    const a = p.ai || {};

    (document.getElementById("level-select") as HTMLSelectElement).value =
      u.level || "intermediate";
    setChecked("playMode", u.playMode || []);
    setChecked("styles", u.styles || []);
    (document.getElementById("spending-select") as HTMLSelectElement).value =
      u.spending || "none";
    (
      document.getElementById("answer-style-select") as HTMLSelectElement
    ).value = a.answerStyle || "normal";

    updateSpendingHint();
  }
}

// ============================================================
// 초기화
// ============================================================
window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("acc-uid")?.addEventListener("input", onUidInput);
  document
    .getElementById("acc-save-btn")
    ?.addEventListener("click", saveAccount);
  document
    .getElementById("profile-save-btn")
    ?.addEventListener("click", saveProfile);
  document
    .getElementById("spending-select")
    ?.addEventListener("change", updateSpendingHint);

  loadAll();
});
