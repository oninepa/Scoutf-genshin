// advisor/test-supabase.js
require("dotenv").config();
const { supabase } = require("./supabase");

async function main() {
  console.log("🔍 Supabase 연결 테스트...");

  const { data, error } = await supabase.from("patches").select("*").limit(5);

  if (error) {
    console.error("❌ 실패:", error.message);
    return;
  }

  console.log("✅ 연결 성공");
  console.log("patches 테이블 응답:", data);
}

main();
