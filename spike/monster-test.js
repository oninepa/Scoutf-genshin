// monster-test.js
const genshindb = require("genshin-db");

const enemy = genshindb.enemies("Ruin Guard");

console.log("=== stats 필드 직접 확인 ===");
console.log(JSON.stringify(enemy.stats, null, 2));

console.log("\n=== version ===");
console.log(enemy.version);
