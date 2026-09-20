// advisor/task-engine.js
// Pointip-Free — 브리핑 + 할 일 생성기 (로컬 규칙 엔진)

const fs = require("fs");
const path = require("path");

const CACHE_DIR = path.join(__dirname, "cache");
const HOYOLAB_PATH = path.join(CACHE_DIR, "hoyolab_latest.json");
const SPIKE_PATH = path.join(
  __dirname,
  "..",
  "spike",
  "output",
  "results.json",
);

// ============================================================
// 유틸: 파일 로드
// ============================================================
function loadJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch {
    return null;
  }
}

// ============================================================
// 계정 상태 수집
// ============================================================
function getState() {
  const hoyo = loadJson(HOYOLAB_PATH);
  const results = loadJson(SPIKE_PATH);

  if (!hoyo) {
    return null;
  }

  const n = hoyo.notes || {};
  const resin = n.resin ?? 0;
  const resinMax = n.max_resin ?? 200;

  const expeditions = n.expeditions || [];
  const expeditionsDone = expeditions.filter(
    (e) => e.status === "Finished",
  ).length;

  return {
    resin: {
      current: resin,
      max: resinMax,
      isFull: resin >= resinMax,
    },
    daily: {
      done: n.commissions_done ?? 0,
      max: n.commissions_max ?? 4,
      isComplete: (n.commissions_done ?? 0) >= (n.commissions_max ?? 4),
    },
    expedition: {
      done: expeditionsDone,
      total: expeditions.length,
      max: n.max_expeditions ?? 5,
      hasFinished: expeditionsDone > 0,
    },
    realm: {
      current: n.realm_currency ?? 0,
      max: n.max_realm_currency ?? 2400,
      isFull: (n.realm_currency ?? 0) >= (n.max_realm_currency ?? 2400),
    },
    weekly: {
      bossDiscountLeft: n.resin_discounts_left ?? 0,
    },
    top3: (results || []).slice(0, 3).map((r) => ({
      team: (r.party || "").replace(/_/g, " + "),
      damage: r.dps,
    })),
  };
}

// ============================================================
// 브리핑 생성
// ============================================================
function buildBriefing(state) {
  if (!state) return ["계정 데이터를 불러올 수 없습니다."];

  const lines = [];
  const r = state.resin;
  const d = state.daily;
  const e = state.expedition;
  const w = state.weekly;

  lines.push(`레진 ${r.current} / ${r.max}` + (r.isFull ? "  (가득 참)" : ""));

  lines.push(
    `일일 의뢰 ${d.done} / ${d.max}` + (d.isComplete ? "  (완료)" : ""),
  );

  if (e.total > 0) {
    lines.push(`파견 ${e.done} / ${e.total} 완료`);
  }

  if (w.bossDiscountLeft > 0) {
    lines.push(`주간 보스 할인 ${w.bossDiscountLeft}회 남음`);
  }

  return lines;
}

// ============================================================
// 할 일 생성 (규칙 엔진)
// ============================================================
function buildTasks(state, profile) {
  if (!state) return [];

  const tasks = [];
  const r = state.resin;
  const d = state.daily;
  const e = state.expedition;
  const re = state.realm;
  const w = state.weekly;

  // 1. 레진이 가득 참
  if (r.isFull) {
    tasks.push({
      priority: 1,
      title: "레진 소모",
      detail: "레진이 가득 찼어요. 비경 또는 보스에서 소모하세요.",
      estimate: "약 5~10분, 레진 60 소모",
      type: "resin",
    });
  } else if (r.current >= 160) {
    tasks.push({
      priority: 2,
      title: "레진 정리",
      detail: `레진 ${r.current}. 오늘 안에 소모하면 좋아요.`,
      estimate: "약 5분",
      type: "resin",
    });
  }

  // 2. 일일 의뢰 미완료
  if (!d.isComplete) {
    const left = d.max - d.done;
    tasks.push({
      priority: 1,
      title: "일일 의뢰",
      detail: `${left}개 남았어요. 모험가 협회에서 받으세요.`,
      estimate: "약 5~10분",
      type: "daily",
    });
  }

  // 3. 파견 완료 회수
  if (e.hasFinished) {
    tasks.push({
      priority: 2,
      title: "파견 회수",
      detail: `파견 ${e.done}개 완료. 회수하고 재개하세요.`,
      estimate: "약 2분",
      type: "expedition",
    });
  }

  // 4. 선계 화폐 가득 참
  if (re.isFull) {
    tasks.push({
      priority: 3,
      title: "선계 화폐 소비",
      detail: "주전자에서 선계 화폐를 사용하세요.",
      estimate: "약 3분",
      type: "realm",
    });
  }

  // 5. 주간 보스 할인 남음
  if (w.bossDiscountLeft > 0) {
    tasks.push({
      priority: 3,
      title: "주간 보스",
      detail: `할인 ${w.bossDiscountLeft}회 남음. 이번 주에 소모하세요.`,
      estimate: "약 10~15분",
      type: "weekly",
    });
  }

  // 6. 프로필 목표 기반 (보너스)
  if (profile?.goal === "abyss_12") {
    tasks.push({
      priority: 4,
      title: "나선비경",
      detail: "12층 36별 목표. 이번 주 도전해보세요.",
      estimate: "약 30분",
      type: "abyss",
    });
  }

  // 우선순위 정렬 후 상위 3개
  return tasks.sort((a, b) => a.priority - b.priority).slice(0, 3);
}

// ============================================================
// 통합 생성
// ============================================================
function generate(profile) {
  const state = getState();
  if (!state) {
    return {
      ok: false,
      message: "계정 데이터가 없습니다. 파싱을 먼저 해주세요.",
    };
  }

  return {
    ok: true,
    state,
    briefing: buildBriefing(state),
    tasks: buildTasks(state, profile),
  };
}

module.exports = {
  generate,
  getState,
  buildBriefing,
  buildTasks,
};
