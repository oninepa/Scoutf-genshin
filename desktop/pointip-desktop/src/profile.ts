// src/profile.ts
// Pointip-Free — 게임 프로필 편집 (계정별)

const API_BASE = "http://127.0.0.1:3000";

// URL 파라미터 (탭별 account 번호)
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
// 계정 정보 저장 (별명 + UID)
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

  // 1. 로컬 저장 (쿠키 매칭용 슬롯)
  const res = await apiPost(`/accounts/${ACCOUNT_INDEX}`, { name, uid });
  if (!res.ok) {
    status("로컬 저장 실패: " + (res.message || ""), "error");
    return;
  }

  // 2. Supabase 저장 (마스터 — UID/별명)
  const supaRes = await apiPost("/auth/uid", {
    uid,
    nickname: name,
    server: detectServer(uid) || "",
  });
  if (!supaRes.ok) {
    status("서버 저장 실패: " + (supaRes.message || ""), "error");
    return;
  }

  status("계정 정보 저장 완료", "success");
  await loadAll();

  // 부모 창(홈)에 갱신 알림
  try {
    console.log("[profile] account-updated 발신!");
    const { emitTo } = await import("@tauri-apps/api/event");
    await emitTo("main", "account-updated");
    console.log("[profile] 발신 성공");
  } catch (e) {
    console.error("[profile] 발신 실패:", e);
  }
}

// ============================================================
// 프로필 저장 (레벨/스타일/과금/AI 답변)
// ============================================================
async function saveProfile() {
  // 1. 계정 정보 (이름 + UID) 먼저 저장
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

  // 로컬 저장
  const accRes = await apiPost(`/accounts/${ACCOUNT_INDEX}`, { name, uid });
  if (!accRes.ok) {
    status("로컬 저장 실패: " + (accRes.message || ""), "error");
    return;
  }

  // Supabase 저장
  const supaRes = await apiPost("/auth/uid", {
    uid,
    nickname: name,
    server: detectServer(uid) || "",
  });
  if (!supaRes.ok) {
    status("서버 저장 실패: " + (supaRes.message || ""), "error");
    return;
  }

  // 2. 프로필 (레벨/스타일/과금/AI 답변) 저장
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
  if (!res.ok) {
    status(
      "프로필 저장 실패: " + (res.errors ? res.errors.join(", ") : ""),
      "error",
    );
    return;
  }

  // 3. 성공
  status("저장 완료", "success");
  await loadAll();

  // 부모 창에 갱신 알림
  try {
    const { emitTo } = await import("@tauri-apps/api/event");
    await emitTo("main", "account-updated");
  } catch {}
}

// ============================================================
// 계정 삭제
// ============================================================
async function deleteAccount() {
  const ok = confirm(
    `계정 ${ACCOUNT_INDEX}을(를) 완전히 삭제하시겠어요?\n(UID, 쿠키, 프로필 모두 삭제)`,
  );
  if (!ok) return;

  // 삭제할 UID 확보 (Supabase에서 지우기 위해)
  const accRes = await apiGet("/accounts");
  const acc = accRes.accounts?.[ACCOUNT_INDEX - 1];
  const uidToDelete = acc?.uid;

  // 1. 로컬 삭제 (폴더 통째)
  const res = await fetch(`${API_BASE}/accounts/${ACCOUNT_INDEX}`, {
    method: "DELETE",
  });
  const data = await res.json();
  if (!data.ok) {
    status("로컬 삭제 실패: " + (data.message || ""), "error");
    return;
  }

  // 2. Supabase 삭제 (UID)
  if (uidToDelete) {
    await fetch(`${API_BASE}/auth/uid/${uidToDelete}`, {
      method: "DELETE",
    });
  }

  status("계정 삭제 완료", "success");
  try {
    const { emitTo } = await import("@tauri-apps/api/event");
    await emitTo("main", "account-updated");
  } catch {}
  setTimeout(async () => {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().close();
  }, 800);
}
// ============================================================
// 초기 로드
// ============================================================
async function loadAll() {
  // 계정 정보 (로컬)
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

  // 프로필 (로컬)
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
    .getElementById("profile-save-btn")
    ?.addEventListener("click", saveProfile);

  const delBtn = document.getElementById("delete-btn");
  if (delBtn) delBtn.addEventListener("click", deleteAccount);

  document
    .getElementById("spending-select")
    ?.addEventListener("change", updateSpendingHint);

  loadAll();
});
