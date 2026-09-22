// advisor/encrypt.js
// 자산 암호화 스크립트 (AES-256-GCM)
// 사용법: node encrypt.js

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// .env 로드 (dotenv 없이 직접)
function loadEnv() {
  const envPath = path.join(__dirname, ".env");
  const env = {};
  try {
    const raw = fs.readFileSync(envPath, "utf-8");
    raw.split("\n").forEach((line) => {
      const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.+)\s*$/);
      if (m) env[m[1]] = m[2].trim();
    });
  } catch (e) {
    console.error("❌ .env 파일 없음:", envPath);
    process.exit(1);
  }
  return env;
}

const env = loadEnv();
const KEY_HEX = env.ASSET_KEY;
if (!KEY_HEX || KEY_HEX.length !== 64) {
  console.error("❌ ASSET_KEY가 없거나 형식이 잘못됨 (64자 16진수 필요)");
  process.exit(1);
}
const KEY = Buffer.from(KEY_HEX, "hex");

// AES-256-GCM 암호화
// 출력 형식: [12바이트 IV][16바이트 AUTH_TAG][암호문]
function encrypt(plaintext) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf-8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]);
}

// 대상 파일 목록
const ASSETS_DIR = path.join(__dirname, "assets");
const TARGETS = [
  { src: "missions.json", dst: "missions.enc" },
  { src: "local-brain", dst: "local-brain.enc", isDir: true },
  { src: "prompts/system.md", dst: "system.enc" },
];

// 디렉토리 → 단일 바이너리로 묶기 (JSON 매니페스트)
function packDir(dirPath) {
  const files = {};
  const names = fs.readdirSync(dirPath);
  for (const name of names) {
    const full = path.join(dirPath, name);
    const stat = fs.statSync(full);
    if (stat.isFile()) {
      files[name] = fs.readFileSync(full).toString("base64");
    }
  }
  return JSON.stringify(files);
}
// 단일 파일 읽기 (경로에 슬래시 있어도 처리)
function readFile(target) {
  return fs.readFileSync(path.join(ASSETS_DIR, target), "utf-8");
}

// 실행
console.log("🔐 자산 암호화 시작...\n");

for (const target of TARGETS) {
  const srcPath = path.join(ASSETS_DIR, target.src);
  const dstPath = path.join(ASSETS_DIR, target.dst);

  if (!fs.existsSync(srcPath)) {
    console.warn(`⚠️  없음: ${target.src}`);
    continue;
  }

  let plaintext;
  if (target.isDir) {
    plaintext = packDir(srcPath);
  } else {
    plaintext = fs.readFileSync(srcPath, "utf-8");
  }

  const encrypted = encrypt(plaintext);
  fs.writeFileSync(dstPath, encrypted);

  const sizeKb = (encrypted.length / 1024).toFixed(1);
  console.log(`✅ ${target.src} → ${target.dst} (${sizeKb} KB)`);
}

console.log("\n🎉 완료");
