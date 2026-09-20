# merge-data.py
# 사용법: python merge-data.py <UID>
# 예시:   python merge-data.py 784667533

import json
import sys
from pathlib import Path


def main():
    uid = sys.argv[1] if len(sys.argv) > 1 else None
    if not uid:
        print("❌ 사용법: python merge-data.py <UID>")
        sys.exit(1)

    base = Path(__file__).parent / "output"
    roster_path = base / f"roster_{uid}.json"
    hoyolab_path = base / f"hoyolab_{uid}.json"

    if not roster_path.exists():
        print(f"❌ Enka 로스터 없음: {roster_path}")
        print("   먼저 node fetchAndConvert.js <UID> 실행하세요.")
        sys.exit(1)

    if not hoyolab_path.exists():
        print(f"❌ HoYoLab 데이터 없음: {hoyolab_path}")
        print("   먼저 python fetch-hoyolab.py 실행하세요.")
        sys.exit(1)

    roster = json.loads(roster_path.read_text(encoding="utf-8"))
    hoyolab = json.loads(hoyolab_path.read_text(encoding="utf-8"))

    # 통합 프로필
    profile = {
        "uid": uid,
        "characters": roster,
        "account": {
            "notes": hoyolab.get("notes"),
            "abyss": hoyolab.get("abyss"),
            "diary": hoyolab.get("diary"),
        },
        "meta": {
            "character_count": len(roster),
            "sources": ["enka.network", "hoyolab.com"],
        },
    }

    out_path = base / f"profile_{uid}.json"
    out_path.write_text(
        json.dumps(profile, ensure_ascii=False, indent=2, default=str),
        encoding="utf-8",
    )

    print(f"✅ 통합 프로필 생성: {out_path}")
    print(f"   - 캐릭터: {len(roster)}명")
    notes = hoyolab.get("notes") or {}
    print(f"   - 레진: {notes.get('resin', '?')}/{notes.get('max_resin', '?')}")
    abyss = hoyolab.get("abyss") or {}
    print(f"   - 나선비경 최고 층: {abyss.get('max_floor', '?')}")
    diary = hoyolab.get("diary") or {}
    print(f"   - 이번 달 원석: {diary.get('current_primogems', '?')}")

    # 캐릭터 목록 간단 출력
    print("\n📋 캐릭터 목록:")
    for i, c in enumerate(roster, 1):
        weapon = c.get("weapon") or {}
        print(f"  {i:2d}. {c.get('key', '?')} (Lv.{c.get('level', '?')}) - {weapon.get('key', '무기 없음')}")


if __name__ == "__main__":
    main()