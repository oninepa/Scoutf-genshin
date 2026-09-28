// advisor/supabase.js
// Supabase 클라이언트 (서버용 - service key 사용)

require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.warn("[supabase] 환경변수 누락. .env 확인 필요.");
}

// 서버용 (service key - 모든 권한)
const supabase = createClient(SUPABASE_URL || "", SUPABASE_SERVICE_KEY || "", {
  auth: { persistSession: false, autoRefreshToken: false },
});

// 사용자용 (anon key - RLS 적용)
const supabaseAnon = createClient(SUPABASE_URL || "", SUPABASE_ANON_KEY || "", {
  auth: { persistSession: false, autoRefreshToken: false },
});

module.exports = { supabase, supabaseAnon };
