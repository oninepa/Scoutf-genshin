import { defineConfig } from "vite";
// @ts-expect-error type error without @types/node package
import process from "node:process";
import { resolve } from "node:path";

const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(() => ({
  // Vite options tailored for Tauri development
  clearScreen: false,

  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },

  // 멀티 페이지 빌드 (index, llm-settings, profile, play)
  build: {
    rollupOptions: {
      input: {
        main: "index.html",
        login: "login.html",
        "llm-settings": "llm-settings.html",
        profile: "profile.html",
        play: "play.html",
      },
    },
  },
}));
