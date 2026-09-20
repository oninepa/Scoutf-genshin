// advisor/set-llm.js
// 사용법: node set-llm.js

const fs = require("fs");
const path = require("path");
const readline = require("readline");

const CONFIG_PATH = path.join(__dirname, "config.json");
const PROVIDERS_PATH = path.join(__dirname, "providers.json");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(q) {
  return new Promise((resolve) => rl.question(q, resolve));
}

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
  } catch {
    return {
      mode: "ollama",
      ollama: { model: "qwen2.5:7b", host: "http://127.0.0.1:11434" },
      api: {},
    };
  }
}

function loadProviders() {
  try {
    return JSON.parse(fs.readFileSync(PROVIDERS_PATH, "utf-8"));
  } catch (e) {
    console.error("❌ providers.json을 읽을 수 없습니다:", e.message);
    process.exit(1);
  }
}

async function main() {
  const providers = loadProviders();
  const config = loadConfig();

  console.log("\n⚙️  LLM 설정\n");
  console.log("  1) 로컬 Ollama (무료, 프라이버시)");
  console.log("  2) 무료 API 프리셋 (추천)");
  console.log("  3) API 직접 입력 (고급)");
  console.log("  4) 사용 안 함 (템플릿만)");
  console.log("");

  const choice = (await ask("선택 (1~4): ")).trim();

  if (choice === "1") {
    const model =
      (await ask("Ollama 모델 [qwen2.5:7b]: ")).trim() || "qwen2.5:7b";
    config.mode = "ollama";
    config.ollama = { model, host: "http://127.0.0.1:11434" };
  } else if (choice === "2") {
    console.log("\n📋 무료 API 프리셋:\n");
    providers.presets.forEach((p, i) => {
      console.log(`  ${i + 1}) ${p.displayName}  [${p.tag}]`);
      console.log(`     ${p.keyHelp}`);
      console.log(`     키 발급: ${p.keyUrl}\n`);
    });

    const idx = parseInt((await ask("선택: ")).trim(), 10) - 1;
    const preset = providers.presets[idx];
    if (!preset) {
      console.log("❌ 잘못된 선택.");
      rl.close();
      return;
    }

    // 💰 비용 안내
    if (preset.costInfo) {
      console.log("\n💰 비용 안내:");
      if (preset.costInfo.freeTier) {
        console.log(`  무료 한도: ${preset.costInfo.freeTier}`);
      }
      if (preset.costInfo.paidAfter) {
        console.log(`  한도 초과 시: ${preset.costInfo.paidAfter}`);
      }
      console.log(
        `  결제 정보 필요: ${preset.costInfo.requireBilling ? "예 (유료 전환 시)" : "아니오 (무료)"}`,
      );
      if (preset.costInfo.note) {
        console.log(`  ℹ️  ${preset.costInfo.note}`);
      }
      console.log("");
    }

    const key = (await ask(`API 키 (${preset.keyUrl}): `)).trim();
    if (!key) {
      console.log("❌ 키가 없습니다.");
      rl.close();
      return;
    }

    config.mode = "api";
    config.api = {
      provider: preset.provider,
      apiKey: key,
      model: preset.model,
      baseUrl: preset.baseUrl || "",
    };
  } else if (choice === "3") {
    console.log("\n💡 고급 모드: OpenAI 호환 API는 baseUrl만 바꾸면 됩니다.");
    console.log(
      "   예: https://api.openai.com/v1, https://api.groq.com/openai/v1",
    );
    console.log("");

    const provider =
      (await ask("provider (gemini|openai-compat) [gemini]: ")).trim() ||
      "gemini";
    const apiKey = (await ask("API 키: ")).trim();
    const model = (await ask("모델명: ")).trim();
    const baseUrl =
      provider === "openai-compat" ? (await ask("baseUrl: ")).trim() : "";

    if (!apiKey || !model) {
      console.log("❌ 키와 모델명은 필수입니다.");
      rl.close();
      return;
    }

    config.mode = "api";
    config.api = { provider, apiKey, model, baseUrl };
  } else if (choice === "4") {
    config.mode = "none";
  } else {
    console.log("❌ 잘못된 선택.");
    rl.close();
    return;
  }

  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
  console.log(`\n✅ 저장됨 (mode: ${config.mode})`);
  if (config.mode === "api") {
    console.log(`   모델: ${config.api.model}`);
    console.log(`   💰 무료 한도 초과 시 자동 결제되지 않습니다.`);
  }
  console.log("   이제 node chatbot.js 로 실행하세요.\n");

  rl.close();
}

main().catch((e) => {
  console.error("❌ 에러:", e.message);
  rl.close();
  process.exit(1);
});
