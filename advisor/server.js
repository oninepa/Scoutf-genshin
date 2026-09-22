// advisor/server.js
// Pointip-Free — HTTP API 서버 (Tauri와 통신)
// 포트: 3000

const http = require("http");
const url = require("url");
const path = require("path");
const fs = require("fs");

const parseManager = require("./parse-manager");
const profile = require("./profile");
const taskEngine = require("./task-engine");

const PORT = 3000;

// ============================================================
// JSON 응답 헬퍼
// ============================================================
function json(res, data, status = 200) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(data));
}

async function readBody(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
}

// ============================================================
// 라우터
// ============================================================
async function handle(req, res) {
  const parsed = url.parse(req.url, true);
  const path = parsed.pathname;
  const method = req.method;

  // CORS preflight
  if (method === "OPTIONS") {
    return json(res, { ok: true });
  }

  // ---- GET /accounts ----
  if (method === "GET" && path === "/accounts") {
    const accounts = require("./accounts");
    return json(res, { ok: true, accounts: accounts.loadAll() });
  }

  // ---- POST /accounts/:n ----
  const accMatch = path.match(/^\/accounts\/(\d+)$/);
  if (method === "POST" && accMatch) {
    const n = parseInt(accMatch[1], 10);
    const accounts = require("./accounts");
    const body = await readBody(req);

    if (n < 1 || n > accounts.MAX_ACCOUNTS) {
      return json(res, { ok: false, message: "잘못된 계정 번호" }, 400);
    }

    if (body.cookie !== undefined) {
      accounts.saveCookie(n, body.cookie);
    }

    const saved = accounts.saveAccount(n, body);
    return json(res, { ok: true, account: saved });
  }

  // ---- GET /auth/status ----
  if (method === "GET" && path === "/auth/status") {
    const auth = require("./auth");
    return json(res, {
      ok: true,
      hasUser: auth.hasUser(),
      session: auth.getSession(),
    });
  }

  // ---- POST /auth/register ----
  if (method === "POST" && path === "/auth/register") {
    const auth = require("./auth");
    const body = await readBody(req);
    const result = auth.register(body.email, body.password);
    return json(res, result);
  }

  // ---- POST /auth/login ----
  if (method === "POST" && path === "/auth/login") {
    const auth = require("./auth");
    const body = await readBody(req);
    const result = auth.login(body.email, body.password);
    return json(res, result);
  }

  // ---- POST /auth/logout ----
  if (method === "POST" && path === "/auth/logout") {
    const auth = require("./auth");
    auth.logout();
    return json(res, { ok: true });
  }

  // ---- DELETE /accounts/:n ----
  if (method === "DELETE" && accMatch) {
    const n = parseInt(accMatch[1], 10);
    const accounts = require("./accounts");
    if (n < 1 || n > accounts.MAX_ACCOUNTS) {
      return json(res, { ok: false, message: "잘못된 계정 번호" }, 400);
    }
    const ok = accounts.deleteAccount(n);
    return json(res, { ok });
  }

  // ---- GET /accounts/:n/cookie ----
  const cookieMatch = path.match(/^\/accounts\/(\d+)\/cookie$/);
  if (method === "GET" && cookieMatch) {
    const n = parseInt(cookieMatch[1], 10);
    const accounts = require("./accounts");
    const cookie = accounts.loadCookie(n);
    return json(res, { ok: true, cookie: cookie || null });
  }

  // ---- GET /status ----
  if (method === "GET" && path === "/status") {
    return json(res, {
      ok: true,
      parse: parseManager.getStatus(),
      profile: profile.load(),
    });
  }

  // ---- POST /parse ----
  // ---- POST /parse ----
  if (method === "POST" && path === "/parse") {
    const body = await readBody(req);
    const accountIndex = body.account || 1;
    const result = await parseManager.parseManual(accountIndex);
    return json(res, result);
  }

  // ---- GET /config ----
  if (method === "GET" && path === "/config") {
    const fs = require("fs");
    const pathMod = require("path");
    const CONFIG_PATH = pathMod.join(__dirname, "config.json");
    try {
      const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
      const config = JSON.parse(raw);
      // API 키는 마스킹 없이 그대로 (로컬만 접근 가능)
      return json(res, { ok: true, config });
    } catch (e) {
      return json(res, { ok: false, message: e.message }, 500);
    }
  }

  // ---- POST /config ----
  if (method === "POST" && path === "/config") {
    const fs = require("fs");
    const pathMod = require("path");
    const CONFIG_PATH = pathMod.join(__dirname, "config.json");
    const body = await readBody(req);

    try {
      let current = {};
      try {
        current = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
      } catch {}

      // 최상위 병합
      const merged = { ...current, ...body };

      // groq, openrouter는 명시적으로 덮어씀 (빈 값도 반영)
      if (body.groq !== undefined) {
        merged.groq = { ...(current.groq || {}), ...body.groq };
      }
      if (body.openrouter !== undefined) {
        merged.openrouter = {
          ...(current.openrouter || {}),
          ...body.openrouter,
        };
      }

      fs.writeFileSync(CONFIG_PATH, JSON.stringify(merged, null, 2));
      return json(res, { ok: true, config: merged });
    } catch (e) {
      return json(res, { ok: false, message: e.message }, 500);
    }
  }

  // ---- GET /briefing ----
  if (method === "GET" && path === "/briefing") {
    const prof = profile.load();
    const gen = taskEngine.generate(prof);
    if (!gen.ok) return json(res, gen);
    return json(res, { ok: true, briefing: gen.briefing });
  }

  // ---- GET /tasks ----
  if (method === "GET" && path === "/tasks") {
    const prof = profile.load();
    const gen = taskEngine.generate(prof);
    if (!gen.ok) return json(res, gen);
    return json(res, { ok: true, tasks: gen.tasks });
  }

  // ---- GET /dashboard (브리핑 + 할 일 통합) ----
  if (method === "GET" && path === "/dashboard") {
    const account = parseInt(parsed.query.account || "1", 10);
    const prof = profile.load(account);
    const gen = taskEngine.generate(prof, account);
    if (!gen.ok) return json(res, gen);
    return json(res, {
      ok: true,
      parse: parseManager.getStatus(),
      profile: prof,
      briefing: gen.briefing,
      tasks: gen.tasks,
    });
  }

  // ---- GET /profile ----
  if (method === "GET" && path === "/profile") {
    const account = parseInt(parsed.query.account || "1", 10);
    return json(res, { ok: true, profile: profile.load(account) });
  }

  // ---- POST /profile ----
  if (method === "POST" && path === "/profile") {
    const body = await readBody(req);
    const account = body.account || 1;
    delete body.account;
    const errors = profile.validate(body);
    if (errors.length > 0) {
      return json(res, { ok: false, errors }, 400);
    }
    const saved = profile.save(account, body);
    return json(res, { ok: true, profile: saved });
  }

  // ---- POST /chat/local ----
  if (method === "POST" && path === "/chat/local") {
    const chatApi = require("./chat-api");
    const body = await readBody(req);
    const result = await chatApi.chatLocal(body.input);
    return json(res, result);
  }

  // ---- POST /chat/llm ----
  if (method === "POST" && path === "/chat/llm") {
    const chatApi = require("./chat-api");
    const body = await readBody(req);
    const result = await chatApi.chatLLM(body.input, body.localAnswer || "");
    return json(res, result);
  }

  // ---- GET /chat/suggestions ----
  if (method === "GET" && path === "/chat/suggestions") {
    const chatApi = require("./chat-api");
    return json(res, { ok: true, suggestions: chatApi.getSuggestions() });
  }

  // ---- 404 ----
  return json(res, { ok: false, message: "Not found" }, 404);
}
// ============================================================
// 서버 시작
// ============================================================
const server = http.createServer((req, res) => {
  handle(req, res).catch((e) => {
    console.error("[server] 에러:", e.stack);
    json(res, { ok: false, message: e.message }, 500);
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Pointip-Free API 서버 시작: http://127.0.0.1:${PORT}`);

  console.log(`  POST /auth/login    로그인`);
  console.log(`  POST /auth/register 회원가입`);
  console.log(`  GET  /auth/status  인증 상태`);
  console.log(`  POST /parse       수동 파싱`);
  console.log(`  GET  /briefing    브리핑`);
  console.log(`  GET  /tasks       할 일 3개`);
  console.log(`  GET  /dashboard   통합 (브리핑+할일+상태)`);
  console.log(`  GET  /profile     프로필 조회`);
  console.log(`  POST /profile     프로필 저장`);
  console.log(`  POST /chat        대화`);
  console.log(`  GET  /chat/suggestions  질문 제안`);
  console.log(`  POST /chat/local  로컬 즉답`);
  console.log(`  POST /chat/llm    LLM 부연`);

  setInterval(
    async () => {
      const accounts = require("./accounts");
      const list = accounts.loadAll();
      for (const acc of list) {
        if (acc.uid) {
          const r = await parseManager.parseAuto(acc.index);
          if (r.ok) console.log(`[auto] 계정 ${acc.index} 파싱 완료`);
        }
      }
    },
    30 * 60 * 1000,
  ); // 30분마다 체크
});
