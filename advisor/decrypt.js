// advisor/decrypt.js
// 자산 복호화 모듈 (AES-256-GCM)
// 메모리에만 올림

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const vm = require("vm");

// .env 로드
function loadEnv() {
  const envPath = path.join(__dirname, ".env");
  const env = {};
  try {
    const raw = fs.readFileSync(envPath, "utf-8");
    raw.split("\n").forEach((line) => {
      const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.+)\s*$/);
      if (m) env[m[1]] = m[2].trim();
    });
  } catch {}
  return env;
}

const env = loadEnv();
const KEY_HEX = env.ASSET_KEY;
if (!KEY_HEX || KEY_HEX.length !== 64) {
  throw new Error("ASSET_KEY가 없거나 형식이 잘못됨");
}
const KEY = Buffer.from(KEY_HEX, "hex");

// 복호화
// 입력 형식: [12바이트 IV][16바이트 AUTH_TAG][암호문]
function decrypt(buffer) {
  const iv = buffer.slice(0, 12);
  const authTag = buffer.slice(12, 28);
  const encrypted = buffer.slice(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
    "utf-8",
  );
}

// 캐시
const cache = {};

// missions.json 복호화
function getMissions() {
  if (cache.missions) return cache.missions;
  const encPath = path.join(__dirname, "assets", "missions.enc");
  const encrypted = fs.readFileSync(encPath);
  const json = decrypt(encrypted);
  cache.missions = JSON.parse(json);
  return cache.missions;
}

// local-brain 디렉토리 복호화
// 각 .js 파일은 메모리에 올려서 require처럼 쓰기 어려움 → 함수로 반환
// (기존)
function getLocalBrainFiles() {
  if (cache.localBrain) return cache.localBrain;
  const encPath = path.join(__dirname, "assets", "local-brain.enc");
  const encrypted = fs.readFileSync(encPath);
  const json = decrypt(encrypted);
  const files = JSON.parse(json);
  const decoded = {};
  for (const [name, b64] of Object.entries(files)) {
    decoded[name] = Buffer.from(b64, "base64").toString("utf-8");
  }
  cache.localBrain = decoded;
  return cache.localBrain;
}

// (새로 붙이기)
function loadLocalBrain() {
  if (cache.localBrainModules) return cache.localBrainModules;

  const files = getLocalBrainFiles();
  const moduleCache = {};

  function makeRequire(fromName) {
    return function (reqPath) {
      if (reqPath.startsWith("./")) {
        const name = reqPath.slice(2).replace(/\.js$/, "") + ".js";
        return loadModule(name);
      }
      return require(reqPath);
    };
  }

  function loadModule(name) {
    if (moduleCache[name]) return moduleCache[name].exports;
    const code = files[name];
    if (!code) throw new Error(`local-brain 파일 없음: ${name}`);

    const module = { exports: {} };
    moduleCache[name] = module;

    const context = {
      module,
      exports: module.exports,
      require: makeRequire(name),
      __dirname: path.join(__dirname, "assets", "local-brain"),
      __filename: path.join(__dirname, "assets", "local-brain", name),
      console,
      process,
    };
    vm.createContext(context);
    vm.runInContext(code, context, { filename: name });
    return module.exports;
  }

  cache.localBrainModules = loadModule("index.js");
  return cache.localBrainModules;
}

// 시스템 프롬프트 로드
function getSystemPrompt() {
  if (cache.systemPrompt) return cache.systemPrompt;
  const encPath = path.join(__dirname, "assets", "system.enc");
  const encrypted = fs.readFileSync(encPath);
  cache.systemPrompt = decrypt(encrypted);
  return cache.systemPrompt;
}
// names-ko 한국어 매핑
function getNamesKo() {
  if (cache.namesKo) return cache.namesKo;
  const files = getLocalBrainFiles();
  const code = files["names-ko.js"];
  if (!code) throw new Error("names-ko.js 없음");

  const module = { exports: {} };
  const vm = require("vm");
  const context = {
    module,
    exports: module.exports,
    require,
    console,
    __dirname: path.join(__dirname, "assets", "local-brain"),
    __filename: path.join(__dirname, "assets", "local-brain", "names-ko.js"),
  };
  vm.createContext(context);
  vm.runInContext(code, context, { filename: "names-ko.js" });
  cache.namesKo = module.exports;
  return cache.namesKo;
}

module.exports = {
  getMissions,
  getLocalBrainFiles,
  getSystemPrompt,
  loadLocalBrain,
  getNamesKo, // ← 추가
  decrypt,
};
