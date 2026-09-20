// rotations.js
// 조합별 최적 로테이션 라이브러리
// key: 파티 gcsim 이름 (알파벳 순 정렬)
// value: 로테이션 템플릿 (gcsim 문법)

const ROTATIONS = {
  // 플린스 중심
  "flins+travelerhydro+sucrose+aino": `
active flins;
travelerhydro skill, burst;
sucrose skill, burst;
aino skill, burst;
flins skill, burst, attack:5;
`,
  // ... 추가
};

// 파티 이름을 키로 변환 (알파벳 순)
function getRotationKey(partyNames) {
  return [...partyNames].sort().join("+");
}

// 로테이션 가져오기 (없으면 null)
function getRotation(partyNames) {
  const key = getRotationKey(partyNames);
  return ROTATIONS[key] || null;
}

module.exports = { ROTATIONS, getRotation, getRotationKey };
