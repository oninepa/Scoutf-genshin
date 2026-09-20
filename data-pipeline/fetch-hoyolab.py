# fetch-hoyolab.py
# 사용법:
#   python fetch-hoyolab.py                        (기본 .env 사용)
#   python fetch-hoyolab.py <ltuid> <ltoken> <uid> (인자 지정)

import asyncio
import json
import os
import sys
from pathlib import Path
from dotenv import load_dotenv
import genshin

load_dotenv()  # .env 파일 로드


def get_credentials():
    """인자 우선, 없으면 .env 사용"""
    if len(sys.argv) >= 4:
        return sys.argv[1], sys.argv[2], sys.argv[3]

    ltuid = os.getenv("HOYOLAB_LTUID")
    ltoken = os.getenv("HOYOLAB_LTOKEN")
    uid = os.getenv("GENSHIN_UID")

    if not ltuid or not ltoken or not uid:
        print(
            "❌ .env 파일에 HOYOLAB_LTUID / HOYOLAB_LTOKEN / GENSHIN_UID 를 설정하세요.",
            file=sys.stderr,
        )
        sys.exit(1)

    return ltuid, ltoken, uid


async def main():
    ltuid, ltoken, uid = get_credentials()

    try:
        ltuid = int(ltuid)
        uid = int(uid)
    except ValueError:
        print("❌ ltuid 와 uid 는 숫자여야 합니다.", file=sys.stderr)
        sys.exit(1)

    cookies = {
        "ltuid_v2": ltuid,
        "ltoken_v2": ltoken,
    }

    client = genshin.Client(cookies, uid=uid)
    print("⏳ HoYoLab 데이터 조회 중...\n")

    result = {"uid": uid}

    # 1. 일일 노트
    print("=== 1. 일일 노트 ===")
    try:
        notes = await client.get_genshin_notes()
        result["notes"] = {
            "resin": notes.current_resin,
            "max_resin": notes.max_resin,
            "resin_recovery": str(notes.remaining_resin_recovery_time),
            "commissions_done": notes.completed_commissions,
            "commissions_max": notes.max_commissions,
            "commission_reward_claimed": notes.claimed_commission_reward,
            "realm_currency": notes.current_realm_currency,
            "max_realm_currency": notes.max_realm_currency,
            "expeditions": [
                {"status": e.status, "remaining": str(e.remaining_time)}
                for e in notes.expeditions
            ],
            "max_expeditions": notes.max_expeditions,
            "resin_discounts_left": notes.remaining_resin_discounts,
            "transformer_recovery": str(notes.remaining_transformer_recovery_time),
        }
        print(f"레진: {notes.current_resin}/{notes.max_resin}")
        print(f"일일 의뢰: {notes.completed_commissions}/{notes.max_commissions}")
        print(f"파견: {len(notes.expeditions)}/{notes.max_expeditions}")
        print(f"선계 화폐: {notes.current_realm_currency}/{notes.max_realm_currency}")
        print(
            f"주간 보스 할인 남음: {notes.remaining_resin_discounts}/{notes.max_resin_discounts}"
        )
    except Exception as e:
        print(f"일일 노트 에러: {e}")

    # 2. 나선비경
    print("\n=== 2. 나선비경 ===")
    try:
        abyss = await client.get_genshin_spiral_abyss(uid)
        result["abyss"] = {
            "season": getattr(abyss, "season", None),
            "max_floor": getattr(abyss, "max_floor", None),
            "total_stars": getattr(abyss, "total_stars", None),
        }
        print(f"최고 층: {result['abyss']['max_floor']}")
        print(f"총 별: {result['abyss']['total_stars']}")
    except Exception as e:
        print(f"나선비경 에러: {e}")

    # 3. 원석 일기
    print("\n=== 3. 원석 일기 ===")
    try:
        diary = await client.get_genshin_diary(uid)
        result["diary"] = {
            "current_primogems": diary.data.current_primogems,
            "current_moras": getattr(diary.data, "current_moras", None),
        }
        print(f"이번 달 원석: {diary.data.current_primogems}")
    except Exception as e:
        print(f"일기 에러: {e}")

    # JSON 저장
    out_dir = Path(__file__).parent / "output"
    out_dir.mkdir(exist_ok=True)
    out_path = out_dir / f"hoyolab_{uid}.json"
    out_path.write_text(
        json.dumps(result, ensure_ascii=False, indent=2, default=str),
        encoding="utf-8",
    )
    print(f"\n💾 저장: {out_path}")


asyncio.run(main())