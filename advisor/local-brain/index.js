// advisor/local-brain/index.js
const { buildFacts } = require("./facts");
const { classify } = require("./classifier");
const { handle } = require("./handlers");

let cachedFacts = null;
let cachedUid = null;

function getFacts(uid) {
  if (cachedUid !== uid || !cachedFacts) {
    cachedFacts = buildFacts(uid);
    cachedUid = uid;
  }
  return cachedFacts;
}

function tryLocal(uid, input) {
  const type = classify(input);
  if (!type) return null;
  const facts = getFacts(uid);
  const answer = handle(type, facts, input); // ← input 추가
  if (!answer) return null;
  return { type, answer };
}

module.exports = { tryLocal, getFacts, classify, handle };
