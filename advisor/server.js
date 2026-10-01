// advisor/server.js
// Pointip-Free — HTTP API 서버 (Tauri와 통신)
// 포트: 3000

const http = require("http");
const url = require("url");
const path = require("path");
// ============================================================
// 질문 로그 수집
// ============================================================
const fs = require("fs");
const LOG_DIR = path.join(__dirname, "logs");
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

function logQuestion(input, type, uid = "unknown") {
  try {
    const logPath = path.join(
      LOG_DIR,
      `questions_${new Date().toISOString().slice(0, 10)}.jsonl`,
    );
    const line =
      JSON.stringify({
        q: input,
        type, // "local" | "llm" | "ai"
        uid,
        at: new Date().toISOString(),
      }) + "\n";
    fs.appendFileSync(logPath, line, "utf-8");
  } catch (e) {
    // 로그 실패는 무시
  }
}

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
    const session = await auth.loadSessionWithRefresh();
    return json(res, {
      ok: true,
      loggedIn: !!session,
      user: session?.user || null,
    });
  }

  // ---- POST /auth/register ----
  if (method === "POST" && path === "/auth/register") {
    const auth = require("./auth");
    const body = await readBody(req);
    const result = await auth.register(
      body.email,
      body.password,
      body.nickname,
    );
    return json(res, result);
  }

  // ---- POST /auth/login ----
  if (method === "POST" && path === "/auth/login") {
    const auth = require("./auth");
    const body = await readBody(req);
    const result = await auth.login(body.email, body.password);
    return json(res, result);
  }

  // ---- POST /auth/logout ----
  if (method === "POST" && path === "/auth/logout") {
    const auth = require("./auth");
    auth.clearSession();
    return json(res, { ok: true });
  }

  // ---- GET /auth/me ----
  if (method === "GET" && path === "/auth/me") {
    const auth = require("./auth");
    const session = await auth.loadSessionWithRefresh();
    if (!session) return json(res, { ok: false, message: "인증 필요" }, 401);
    const profile = await auth.getProfile(session.user.id);
    const genshinUid = await auth.getGenshinUid(session.user.id);
    return json(res, {
      ok: true,
      user: session.user,
      profile,
      genshinUid,
    });
  }
  // ---- POST /auth/profile/update ----
  if (method === "POST" && path === "/auth/profile/update") {
    const auth = require("./auth");
    const session = await auth.loadSessionWithRefresh();
    if (!session) return json(res, { ok: false, message: "인증 필요" }, 401);
    const body = await readBody(req);
    const result = await auth.updateProfile(session.user.id, body);
    return json(res, result);
  }

  // ---- POST /auth/uid ----
  if (method === "POST" && path === "/auth/uid") {
    const auth = require("./auth");
    const session = await auth.loadSessionWithRefresh();
    if (!session) return json(res, { ok: false, message: "인증 필요" }, 401);
    const body = await readBody(req);
    const result = await auth.saveGenshinUid(
      session.user.id,
      body.uid,
      body.nickname || "",
      body.server || "",
    );
    return json(res, result);
  }

  // ---- GET /auth/uid ---- (대표 UID 1개)
  if (method === "GET" && path === "/auth/uid") {
    const auth = require("./auth");
    const session = await auth.loadSessionWithRefresh();
    if (!session) return json(res, { ok: false, message: "인증 필요" }, 401);
    const uid = await auth.getGenshinUid(session.user.id);
    return json(res, { ok: true, uid });
  }

  // ---- GET /auth/uids ---- (모든 UID 목록)
  if (method === "GET" && path === "/auth/uids") {
    const auth = require("./auth");
    const session = await auth.loadSessionWithRefresh();
    if (!session) return json(res, { ok: false, message: "인증 필요" }, 401);
    const uids = await auth.getAllGenshinUids(session.user.id);
    return json(res, { ok: true, uids });
  }

  // ---- DELETE /auth/uid/:uid ---- (UID 삭제)
  const uidDeleteMatch = path.match(/^\/auth\/uid\/(\d+)$/);
  if (method === "DELETE" && uidDeleteMatch) {
    const auth = require("./auth");
    const session = await auth.loadSessionWithRefresh();
    if (!session) return json(res, { ok: false, message: "인증 필요" }, 401);
    const uidToDelete = uidDeleteMatch[1];
    const result = await auth.deleteGenshinUid(session.user.id, uidToDelete);
    return json(res, result);
  }

  // ---- GET /auth/google/start ----
  if (method === "GET" && path === "/auth/google/start") {
    const auth = require("./auth");
    const redirectTo =
      parsed.query.redirect || "http://localhost:3000/auth/google/callback";
    const result = await auth.getGoogleAuthUrl(redirectTo);
    return json(res, result);
  }

  // ---- GET /auth/google/callback ----
  if (method === "GET" && path === "/auth/google/callback") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`<!doctype html>
<html lang="ko">
<head><meta charset="UTF-8"><title>로그인 처리 중</title>
<style>
  body { font-family: sans-serif; text-align: center; padding: 60px 20px; background: #1a1a1a; color: #eee; }
  h1 { font-size: 24px; margin-bottom: 16px; }
  p { color: #aaa; font-size: 14px; }
</style>
</head>
<body>
  <h1 id="title">처리 중...</h1>
  <p id="msg"></p>
  <script>
    (async () => {
      const params = new URLSearchParams(window.location.hash.substring(1));
      const access_token = params.get("access_token");
      if (!access_token) {
        document.getElementById("title").textContent = "❌ 토큰 없음";
        return;
      }
      try {
        const res = await fetch("http://localhost:3000/auth/google/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            access_token,
            refresh_token: params.get("refresh_token"),
            expires_at: parseInt(params.get("expires_at") || "0", 10),
          }),
        });
        const data = await res.json();
        if (data.ok) {
          document.getElementById("title").textContent = "✅ 로그인 완료";
          document.getElementById("msg").textContent = "이 창을 닫고 ScoutF-Genshin 앱으로 돌아가세요.";
        } else {
          document.getElementById("title").textContent = "❌ 실패";
          document.getElementById("msg").textContent = data.message || "";
        }
      } catch (e) {
        document.getElementById("title").textContent = "❌ 오류";
        document.getElementById("msg").textContent = e.message;
      }
    })();
  </script>
</body>
</html>`);
    return;
  }

  // ---- POST /auth/google/session ----
  if (method === "POST" && path === "/auth/google/session") {
    const body = await readBody(req);
    const { access_token, refresh_token, expires_at } = body;
    if (!access_token) {
      return json(res, { ok: false, message: "토큰 없음" }, 400);
    }
    const auth = require("./auth");
    const user = await auth.getUser(access_token);
    if (!user) {
      return json(res, { ok: false, message: "유효하지 않은 토큰" }, 401);
    }
    auth.saveSession(user, {
      access_token,
      refresh_token: refresh_token || "",
      expires_at: expires_at || 0,
    });
    return json(res, { ok: true, user });
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
    const account = parseInt(parsed.query.account || "1", 10);
    const prof = profile.load(account);
    const gen = taskEngine.generate(prof, account);
    if (!gen.ok) return json(res, gen);
    return json(res, { ok: true, briefing: gen.briefing });
  }

  // ---- GET /tasks ----
  if (method === "GET" && path === "/tasks") {
    const account = parseInt(parsed.query.account || "1", 10);
    const prof = profile.load(account);
    const gen = taskEngine.generate(prof, account);
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
      state: gen.state,
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
    logQuestion(body.input, "local"); // ← 추가
    const result = await chatApi.chatLocal(body.input);
    return json(res, result);
  }

  // ---- POST /chat/ai ----
  if (method === "POST" && path === "/chat/ai") {
    const chatApi = require("./chat-api");
    const body = await readBody(req);
    logQuestion(body.input, "ai"); // ← 추가
    const result = await chatApi.chatAI(body.input || "");
    return json(res, result);
  }

  // ---- POST /chat/llm ----
  if (method === "POST" && path === "/chat/llm") {
    const chatApi = require("./chat-api");
    const body = await readBody(req);
    logQuestion(body.input, "llm"); // ← 추가
    const result = await chatApi.chatLLM(body.input, body.localAnswer || "");
    return json(res, result);
  }

  // ---- GET /chat/suggestions ----
  if (method === "GET" && path === "/chat/suggestions") {
    const chatApi = require("./chat-api");
    return json(res, { ok: true, suggestions: chatApi.getSuggestions() });
  }

  // ---- GET /mission/random ----
  if (method === "GET" && path === "/mission/random") {
    const missions = require("./missions");
    const picks = missions.randomMissions(3);
    return json(res, { ok: true, missions: picks });
  }

  // ---- GET /mission/categories ----
  if (method === "GET" && path === "/mission/categories") {
    const missions = require("./missions");
    return json(res, { ok: true, categories: missions.listCategories() });
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
