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
  const abyss = hoyo.abyss || {};
  const stats = hoyo.stats || {};
  const teapot = hoyo.teapot || {};
  const diary = hoyo.diary || {};
  const explorations = hoyo.explorations || [];

  const resin = n.resin ?? 0;
  const resinMax = n.max_resin ?? 200;

  const expeditions = n.expeditions || [];
  const expeditionsDone = expeditions.filter(
    (e) => e.status === "Finished",
  ).length;

  // 신의 눈 합계
  const oculiTotal =
    (stats.anemoculi || 0) +
    (stats.geoculi || 0) +
    (stats.dendroculi || 0) +
    (stats.electroculi || 0) +
    (stats.hydroculi || 0) +
    (stats.pyroculi || 0) +
    (stats.lunoculi || 0);

  // 상자 합계
  const chests =
    (stats.common_chests || 0) +
    (stats.exquisite_chests || 0) +
    (stats.precious_chests || 0) +
    (stats.luxurious_chests || 0) +
    (stats.remarkable_chests || 0);

  // 지역별 데이터 맵
  const regionMap = {};
  explorations.forEach((exp) => {
    regionMap[exp.name] = {
      explored: exp.explored,
      level: exp.level || 0,
      type: exp.type,
    };
  });

  // 지역별 평판 레벨
  const reputation = {
    mondstadt: regionMap["몬드"]?.level || 0,
    liyue: regionMap["리월"]?.level || 0,
    inazuma: regionMap["이나즈마"]?.level || 0,
    sumeru: regionMap["수메르"]?.level || 0,
    fontaine: regionMap["폰타인"]?.level || 0,
    natlan: regionMap["나타"]?.level || 0,
    nodkrai: regionMap["노드크라이"]?.level || 0,
  };

  // 지역별 탐험 포인트 (0보다 큰 것만, 내림차순)
  const explorationPoints = Object.entries(regionMap)
    .filter(([_, data]) => data.explored > 0)
    .sort((a, b) => b[1].explored - a[1].explored);

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
      rewardClaimed: n.commission_reward_claimed ?? false,
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
    abyss: {
      season: abyss.season,
      maxFloor: abyss.max_floor || "0-0",
      stars: abyss.total_stars ?? 0,
    },
    stats: {
      achievements: stats.achievements ?? 0,
      daysActive: stats.days_active ?? 0,
      characters: stats.characters ?? 0,
      oculiTotal,
      chests,
      waypoints: stats.unlocked_waypoints ?? 0,
      domains: stats.unlocked_domains ?? 0,
    },
    teapot: {
      level: teapot.level ?? 0,
      comfort: teapot.comfort ?? 0,
      comfortName: teapot.comfort_name || "",
    },
    diary: {
      primogems: diary.current_primogems ?? 0,
    },
    explorations,
    reputation,
    explorationPoints,
    transformer: {
      recovery: n.transformer_recovery || "0:00:00",
      isReady: (n.transformer_recovery || "").startsWith("0:00:00"),
    },
    top3: (results || []).slice(0, 3).map((r) => ({
      team: (r.party || "").replace(/_/g, " + "),
      damage: r.dps,
    })),
  };
}

// ============================================================
// 현 상태 브리핑 (B안: 7줄)
// ============================================================
function buildBriefing(state) {
  if (!state) return ["계정 데이터를 불러올 수 없습니다."];

  const lines = [];
  const r = state.resin;
  const d = state.daily;
  const e = state.expedition;
  const re = state.realm;
  const w = state.weekly;
  const a = state.abyss;
  const s = state.stats;
  const t = state.teapot;

  // 1줄: 일일 핵심
  lines.push(
    `레진 ${r.current}/${r.max}${r.isFull ? " (가득)" : ""} · ` +
      `일일 ${d.done}/${d.max} · 파견 ${e.done}/${e.max}`,
  );

  // 2줄: 주간/선계
  lines.push(
    `선계 ${re.current}/${re.max} · 주간보스 ${w.bossDiscountLeft}/3 · ` +
      `${state.transformer.isReady ? "변환 가능" : "변환 " + state.transformer.recovery}`,
  );

  // 3줄: 계정 통계
  lines.push(
    `업적 ${s.achievements} · 캐릭터 ${s.characters}명 · 접속 ${s.daysActive}일`,
  );

  // 4줄: 나선/선계레벨
  lines.push(`나선 ${a.stars}/36별 · 선계 Lv.${t.level}/10`);

  // 5줄: 지역별 평판
  const rep = state.reputation || {};
  const repParts = [];
  if (rep.mondstadt) repParts.push(`몬드${rep.mondstadt}`);
  if (rep.liyue) repParts.push(`리월${rep.liyue}`);
  if (rep.inazuma) repParts.push(`이나즈마${rep.inazuma}`);
  if (rep.sumeru) repParts.push(`수메르${rep.sumeru}`);
  if (rep.fontaine) repParts.push(`폰타인${rep.fontaine}`);
  if (rep.natlan) repParts.push(`나타${rep.natlan}`);
  if (rep.nodkrai) repParts.push(`노드크라이${rep.nodkrai}`);
  if (repParts.length > 0) {
    lines.push(`평판: ${repParts.join(" · ")}`);
  }

  // 6줄: 지역별 탐험 포인트 Top 6
  if (state.explorationPoints && state.explorationPoints.length > 0) {
    const topExp = state.explorationPoints.slice(0, 6);
    lines.push(
      `탐험: ` +
        topExp.map(([name, data]) => `${name} ${data.explored}p`).join(" · "),
    );
  }

  return lines;
}

// ============================================================
// 할 일 생성 (규칙 엔진) — 최대 7개
// ============================================================
function buildTasks(state, profile) {
  if (!state) return [];

  const tasks = [];
  const r = state.resin;
  const d = state.daily;
  const e = state.expedition;
  const re = state.realm;
  const w = state.weekly;
  const a = state.abyss;

  // 1. 레진 가득
  if (r.isFull) {
    tasks.push({
      priority: 1,
      title: "레진 소모",
      detail: "레진이 가득 찼어요. 비경 또는 보스에서 소모하세요.",
      type: "resin",
    });
  } else if (r.current >= 160) {
    tasks.push({
      priority: 2,
      title: "레진 정리",
      detail: `레진 ${r.current}. 오늘 안에 소모하세요.`,
      type: "resin",
    });
  }

  // 2. 일일 의뢰 미완료
  if (!d.isComplete) {
    const left = d.max - d.done;
    tasks.push({
      priority: 1,
      title: `일일 의뢰 ${left}개`,
      detail: "모험가 협회에서 받으세요.",
      type: "daily",
    });
  }

  // 3. 보상 미수령
  if (d.isComplete && !d.rewardClaimed) {
    tasks.push({
      priority: 2,
      title: "일일 보상 수령",
      detail: "모험가 협회에서 보상을 받으세요.",
      type: "daily_reward",
    });
  }

  // 4. 파견 완료 회수
  if (e.hasFinished) {
    tasks.push({
      priority: 2,
      title: `파견 회수 ${e.done}개`,
      detail: "회수하고 재파견하세요.",
      type: "expedition",
    });
  }

  // 5. 선계 화폐 가득
  if (re.isFull) {
    tasks.push({
      priority: 3,
      title: "선계 화폐 소비",
      detail: "주전자에서 선계 화폐를 사용하세요.",
      type: "realm",
    });
  }

  // 6. 주간 보스 할인 남음
  if (w.bossDiscountLeft > 0) {
    tasks.push({
      priority: 3,
      title: `주간보스 ${w.bossDiscountLeft}회`,
      detail: "할인 남음. 이번 주에 소모하세요.",
      type: "weekly",
    });
  }

  // 7. 나선비경 미진행
  if (a.stars === 0) {
    tasks.push({
      priority: 4,
      title: "나선비경 시작",
      detail: "이번 시즌 아직 안 하셨어요.",
      type: "abyss",
    });
  } else if (a.stars < 36) {
    tasks.push({
      priority: 4,
      title: `나선비경 ${36 - a.stars}별`,
      detail: "이번 시즌 남은 별을 노려보세요.",
      type: "abyss",
    });
  }

  // 8. 변환 코인
  if (state.transformer.isReady) {
    tasks.push({
      priority: 4,
      title: "변환 코인 사용",
      detail: "변환기가 준비됐어요.",
      type: "transformer",
    });
  }

  // 우선순위 정렬 후 상위 7개
  return tasks.sort((a, b) => a.priority - b.priority).slice(0, 7);
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
