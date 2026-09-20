// fetch-hoyolab-raw.js
// 사용법: node fetch-hoyolab-raw.js "<ltmid>|<ltuid>|<ltoken>" <UID>

const crypto = require("crypto");

// HoYoLab 웹(client_type=4)용 DS 서명 직접 생성
function generateDS() {
  // 웹 클라이언트용 최신 salt
  const salt = "6cqshh5dhw73bzxn20oexa9k516chk7s";
  const t = Math.floor(Date.now() / 1000);
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let r = "";
  for (let i = 0; i < 6; i++) {
    r += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const raw = `salt=${salt}&t=${t}&r=${r}`;
  const hash = crypto.createHash("md5").update(raw).digest("hex");
  return `${t},${r},${hash}`;
}

function generateDeviceId() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function main() {
  const arg = process.argv[2];
  const uid = process.argv[3];

  if (!arg || !uid) {
    console.error(
      '❌ 사용법: node fetch-hoyolab-raw.js "<ltmid>|<ltuid>|<ltoken>" <UID>',
    );
    process.exit(1);
  }

  const [ltmid, ltuid, ltoken] = arg.split("|");
  if (!ltmid || !ltuid || !ltoken) {
    console.error("❌ 세 값이 모두 필요합니다. 형식: ltmid|ltuid|ltoken");
    process.exit(1);
  }

  const headers = {
    Cookie: `ltmid_v2=${ltmid}; ltuid_v2=${ltuid}; ltoken_v2=${ltoken}`,
    DS: generateDS(),
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    Referer: "https://www.hoyolab.com/",
    Origin: "https://www.hoyolab.com",
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "ko-KR,ko;q=0.9",
    // 최신 버전 정보 적용
    "x-rpc-app_version": "4.8.0",
    "x-rpc-client_type": "4",
    "x-rpc-language": "ko-kr",
    "x-rpc-device_id": generateDeviceId(),
    "x-rpc-platform": "4",
    "X-Requested-With": "com.mihoyo.hoyolab",
  };

  const region = "os_asia";
  const gameBiz = "hk4e_global";
  const bbsUrl = "https://bbs-api-os.hoyolab.com";

  console.log("⏳ HoYoLab API 호출 중...\n");

  console.log("=== 1. 일일 노트 ===");
  await tryFetch(
    `${bbsUrl}/game_record/genshin/api/dailyNote?server=${region}&role_id=${uid}&game_biz=${gameBiz}`,
    headers,
  );

  console.log("\n=== 2. 나선비경 ===");
  await tryFetch(
    `${bbsUrl}/game_record/genshin/api/spiralAbyss?server=${region}&role_id=${uid}&schedule_type=1&game_biz=${gameBiz}`,
    headers,
  );

  // 일기 API는 별도 도메인 및 경로 사용
  console.log("\n=== 3. 원석 일기 ===");
  await tryFetch(
    `https://api-takumi-record.mihoyo.com/game_record/app/genshin/api/diary?month=0&uid=${uid}&region=${region}`,
    headers,
  );
}

async function tryFetch(url, headers) {
  try {
    const res = await fetch(url, { headers });
    const text = await res.text();
    if (res.status !== 200) {
      console.error(`HTTP ${res.status}:`, text.slice(0, 300));
      return;
    }
    const json = JSON.parse(text);
    if (json.retcode !== 0) {
      console.error(`retcode ${json.retcode}: ${json.message}`);
      return;
    }
    console.log(JSON.stringify(json.data, null, 2));
  } catch (e) {
    console.error("에러:", e.message);
  }
}

main();
