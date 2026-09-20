// advisor/tts.js
// Pointip-Free — 지니 음성 출력 (Edge TTS)
// msedge-tts 사용 (Python 서버 불필요)

const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const { exec } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);

const CACHE_DIR = path.join(__dirname, "tts_cache");

// ============================================================
// 음성 프리셋 (Edge TTS)
// ============================================================
const PRESETS = {
  ko: {
    female: { name: "지니 (여성)", voice: "ko-KR-SunHiNeural" },
    male: { name: "지니 (남성)", voice: "ko-KR-InJoonNeural" },
  },
  en: {
    female: { name: "Genie (Female)", voice: "en-US-JennyNeural" },
    male: { name: "Genie (Male)", voice: "en-US-GuyNeural" },
  },
  ja: {
    female: { name: "ジニー (女性)", voice: "ja-JP-NanamiNeural" },
    male: { name: "ジニー (男性)", voice: "ja-JP-KeitaNeural" },
  },
  zh: {
    female: { name: "吉妮 (女声)", voice: "zh-CN-XiaoxiaoNeural" },
    male: { name: "吉妮 (男声)", voice: "zh-CN-YunxiNeural" },
  },
};

function detectLanguage() {
  const envLang =
    process.env.LANG ||
    process.env.LC_ALL ||
    process.env.LC_MESSAGES ||
    "ko_KR";
  if (envLang.startsWith("ko")) return "ko";
  if (envLang.startsWith("ja")) return "ja";
  if (envLang.startsWith("zh")) return "zh";
  return "en";
}

let currentLang = detectLanguage();
let currentPreset = "female";
let currentRate = "+15%";

function setPreset(preset) {
  const key = preset.toLowerCase();
  if (!["male", "female"].includes(key)) {
    throw new Error(`알 수 없는 프리셋: ${preset}`);
  }
  currentPreset = key;
  return getPresetInfo();
}

function setLanguage(lang) {
  if (!PRESETS[lang]) throw new Error(`지원하지 않는 언어: ${lang}`);
  currentLang = lang;
  return getPresetInfo();
}

function setRate(rate) {
  currentRate = rate;
  return getPresetInfo();
}

function getPresetInfo() {
  const preset = PRESETS[currentLang][currentPreset];
  return {
    lang: currentLang,
    preset: currentPreset,
    rate: currentRate,
    ...preset,
  };
}

function listPresets() {
  return Object.entries(PRESETS[currentLang]).map(([key, p]) => ({
    key,
    name: p.name,
  }));
}

// ============================================================
// 숫자 → 한글 (3자리 이상)
// ============================================================
function numberToKorean(numStr) {
  const n = parseInt(numStr, 10);
  if (isNaN(n)) return numStr;
  if (n === 0) return "영";

  const units = ["", "십", "백", "천"];
  const bigUnits = ["", "만", "억", "조"];
  const digits = ["", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구"];

  let result = "";
  let bigIdx = 0;
  let num = n;

  while (num > 0) {
    const part = num % 10000;
    if (part > 0) {
      let partStr = "";
      let temp = part;
      let unitIdx = 0;
      while (temp > 0) {
        const d = temp % 10;
        if (d > 0) partStr = digits[d] + units[unitIdx] + partStr;
        temp = Math.floor(temp / 10);
        unitIdx++;
      }
      result = partStr + bigUnits[bigIdx] + result;
    }
    num = Math.floor(num / 10000);
    bigIdx++;
  }
  return result;
}

// ============================================================
// TTS 텍스트 정리
// ============================================================
function prepareForSpeech(text) {
  if (!text) return "";
  let t = text;

  t = t.replace(/%/g, "퍼센트");
  t = t.replace(/[\u4E00-\u9FFF\u3040-\u30FF]/g, "");
  t = t.replace(/\(([^)]+)\)/g, "$1");
  t = t.replace(/\[([^\]]+)\]/g, "$1");
  t = t.replace(/\*\*(.+?)\*\*/g, "$1");
  t = t.replace(/\*(.+?)\*/g, "$1");
  t = t.replace(/`([^`]+)`/g, "$1");
  t = t.replace(/^#+\s*/gm, "");
  t = t.replace(/^\s*[-*]\s+/gm, "그리고 ");
  t = t.replace(/_/g, " 와 ");
  t = t.replace(/\//g, " 또는 ");
  t = t.replace(/→/g, " 에서 ");

  t = t.replace(/\b(\d{3,})\b/g, (m) => numberToKorean(m));
  t = t.replace(/(\d+)\.(\d+)/g, (m, a, b) => `${a}점${b}`);

  t = t.replace(/~/g, "");
  t = t.replace(
    /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/gu,
    "",
  );

  const statMap = {
    "HP%": "체력 퍼센트",
    "ATK%": "공격력 퍼센트",
    "DEF%": "방어력 퍼센트",
    HP: "체력",
    ATK: "공격력",
    DEF: "방어력",
    "crit rate": "치명타 확률",
    "crit dmg": "치명타 피해",
    "CRIT Rate": "치명타 확률",
    "CRIT DMG": "치명타 피해",
  };
  for (const [en, kr] of Object.entries(statMap)) {
    t = t.replace(new RegExp(en, "g"), kr);
  }

  const wordMap = {
    Burst: "원소폭발",
    burst: "원소폭발",
    Skill: "원소전투스킬",
    skill: "원소전투스킬",
    DPS: "데미지",
    dps: "데미지",
    Buff: "버프",
    Debuff: "디버프",
  };
  for (const [en, kr] of Object.entries(wordMap)) {
    t = t.replace(new RegExp(`\\b${en}\\b`, "g"), kr);
  }

  t = t.replace(/[ \t]+/g, " ");
  t = t.replace(/\n{3,}/g, "\n\n");

  return t.trim();
}

// ============================================================
// 한 문장 합성 (재사용)
// ============================================================
async function synthOne(text, voice, rate) {
  const { MsEdgeTTS, OUTPUT_FORMAT } = require("msedge-tts");
  const tts = new MsEdgeTTS();
  await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

  const { audioStream } = tts.toStream(text, { rate: rate, pitch: "+0Hz" });

  const chunks = [];
  await new Promise((resolve, reject) => {
    let lastData = Date.now();
    const checkTimer = setInterval(() => {
      if (Date.now() - lastData > 5000) {
        clearInterval(checkTimer);
        reject(new Error("STALL"));
      }
    }, 1000);

    audioStream.on("data", (c) => {
      lastData = Date.now();
      chunks.push(c);
    });
    audioStream.on("end", () => {
      clearInterval(checkTimer);
      resolve();
    });
    audioStream.on("error", (e) => {
      clearInterval(checkTimer);
      reject(e);
    });
  });

  if (chunks.length === 0) throw new Error("EMPTY");
  return Buffer.concat(chunks);
}

// ============================================================
// 긴 텍스트 → 문장 배열로 분할
// ============================================================
function splitSentences(text, maxLen = 40) {
  // 1차: 문장 단위
  const raw = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  // 2차: 너무 긴 문장은 쉼표/그리고 로 재분할
  const result = [];
  for (const s of raw) {
    if (s.length <= maxLen) {
      result.push(s);
      continue;
    }
    const parts = s.split(/,\s*|\s+그리고\s+/);
    let buf = "";
    for (const p of parts) {
      if ((buf + ", " + p).length > maxLen && buf) {
        result.push(buf.trim());
        buf = p;
      } else {
        buf = buf ? buf + ", " + p : p;
      }
    }
    if (buf.trim()) result.push(buf.trim());
  }
  return result;
}

// ============================================================
// 음성 합성 + 재생
// ============================================================
async function speak(text, options = {}) {
  const cleanText = prepareForSpeech(text);
  if (!cleanText) return null;

  const presetKey = options.preset || currentPreset;
  const lang = options.lang || currentLang;
  const rate = options.rate || currentRate;
  const preset = PRESETS[lang][presetKey];
  if (!preset) throw new Error(`프리셋 없음: ${lang}/${presetKey}`);

  await fs.mkdir(CACHE_DIR, { recursive: true });

  const hash = crypto
    .createHash("md5")
    .update(cleanText + preset.voice + rate)
    .digest("hex");
  const outPath = path.join(CACHE_DIR, `${hash}.mp3`);

  let cached = false;
  try {
    await fs.access(outPath);
    cached = true;
  } catch {}

  if (!cached) {
    const sentences = splitSentences(cleanText);

    if (sentences.length === 0) return null;

    const buffers = [];
    for (let i = 0; i < sentences.length; i++) {
      const s = sentences[i];
      let buf = null;

      for (let retry = 0; retry < 2; retry++) {
        try {
          buf = await synthOne(s, preset.voice, rate);
          break;
        } catch (e) {
          if (retry === 1) {
            console.warn(`  [TTS] 문장 ${i + 1} 실패: ${e.message}`);
          } else {
            await new Promise((r) => setTimeout(r, 300));
          }
        }
      }

      if (buf) buffers.push(buf);
    }

    await fs.writeFile(outPath, Buffer.concat(buffers));
  }

  // 재생
  try {
    if (process.platform === "win32") {
      try {
        await execPromise(
          `ffplay -nodisp -autoexit -loglevel quiet "${outPath}"`,
        );
        return outPath;
      } catch {}

      await execPromise(`start "" "${outPath}"`);
    } else if (process.platform === "darwin") {
      await execPromise(`afplay "${outPath}"`);
    } else {
      try {
        await execPromise(
          `ffplay -nodisp -autoexit -loglevel quiet "${outPath}"`,
        );
      } catch {
        await execPromise(`aplay -q "${outPath}"`);
      }
    }
  } catch (e) {
    console.warn("음성 재생 실패:", e.message);
  }

  return outPath;
}

module.exports = {
  speak,
  prepareForSpeech,
  setPreset,
  setLanguage,
  setRate,
  getPresetInfo,
  listPresets,
  detectLanguage,
  PRESETS,
};
