// advisor/patches.js
// Pointip-Free — 패치 버전 관리 (Supabase)

const { supabase } = require("./supabase");

// ============================================================
// 최신 패치 조회
// ============================================================
async function getLatest() {
  const { data, error } = await supabase
    .from("patches")
    .select("*")
    .eq("is_latest", true)
    .order("released_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return null;
  return data;
}

// ============================================================
// 버전 비교 (semver 단순 비교: "0.1.0" vs "0.1.1")
// ============================================================
function compareVersion(a, b) {
  const pa = String(a).split(".").map(Number);
  const pb = String(b).split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) < (pb[i] || 0)) return -1;
    if ((pa[i] || 0) > (pb[i] || 0)) return 1;
  }
  return 0;
}

// ============================================================
// 현재 버전 vs 최신 버전 체크
// ============================================================
async function checkUpdate(currentVersion) {
  if (!currentVersion) {
    return { ok: false, message: "current 파라미터 필요" };
  }

  const latest = await getLatest();
  if (!latest) {
    return { ok: true, hasUpdate: false, current: currentVersion };
  }

  const cmp = compareVersion(currentVersion, latest.version);
  const hasUpdate = cmp < 0;

  return {
    ok: true,
    hasUpdate,
    current: currentVersion,
    latest: hasUpdate
      ? {
          version: latest.version,
          notes: latest.notes || "",
          download_url: latest.download_url || "",
          file_size: latest.file_size || 0,
          is_mandatory: latest.is_mandatory || false,
          released_at: latest.released_at,
        }
      : null,
  };
}

// ============================================================
// 패치 등록 (관리자용, 나중에)
// ============================================================
async function registerPatch(
  version,
  notes,
  downloadUrl,
  fileSize,
  isMandatory = false,
) {
  // 기존 latest 해제
  await supabase
    .from("patches")
    .update({ is_latest: false })
    .eq("is_latest", true);

  // 신규 등록
  const { data, error } = await supabase
    .from("patches")
    .insert({
      version,
      notes,
      download_url: downloadUrl,
      file_size: fileSize,
      is_latest: true,
      is_mandatory: isMandatory,
    })
    .select()
    .single();

  if (error) return { ok: false, message: error.message };
  return { ok: true, patch: data };
}

module.exports = {
  getLatest,
  checkUpdate,
  compareVersion,
  registerPatch,
};
