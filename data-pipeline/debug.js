const { EnkaClient } = require("enka-network-api");
const util = require("util");

async function main() {
  const enka = new EnkaClient({ defaultLanguage: "kr" });
  await enka.cachedAssetsManager.fetchAllContents();
  const user = await enka.fetchUser(784667533);
  const c = user.characters[0];
  const a = c.artifacts[0];

  console.log("=== mainstat 원본 ===");
  console.log(util.inspect(a.mainstat, { depth: 3 }));

  console.log("\n=== substats 원본 ===");
  console.log("배열이냐?", Array.isArray(a.substats), " / 타입:", typeof a.substats);
  console.log(util.inspect(a.substats, { depth: 3 }));

  console.log("\n=== skillLevels 원본 ===");
  console.log(util.inspect(c.skillLevels, { depth: 2 }));
}
main().catch(e => { console.error(e); process.exit(1); });