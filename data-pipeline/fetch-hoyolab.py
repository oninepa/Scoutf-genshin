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

load_dotenv()


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


def safe_str(v):
    if v is None:
        return None
    return str(v)


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

    client = genshin.Client(cookies, uid=uid, lang="ko-kr")
    print("🚀 HoYoLab 데이터 조회 중...\n")

    result = {"uid": uid}

    # ============================================================
    # 1. 일일 노트
    # ============================================================
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
        print(f"  레진: {notes.current_resin}/{notes.max_resin}")
        print(f"  일일 의뢰: {notes.completed_commissions}/{notes.max_commissions}")
        print(f"  파견: {len(notes.expeditions)}/{notes.max_expeditions}")
        print(f"  선계 화폐: {notes.current_realm_currency}/{notes.max_realm_currency}")
    except Exception as e:
        print(f"  ⚠️ 일일 노트 에러: {e}")

    # ============================================================
    # 2. 나선비경
    # ============================================================
    print("\n=== 2. 나선비경 ===")
    try:
        abyss = await client.get_genshin_spiral_abyss(uid)
        result["abyss"] = {
            "season": getattr(abyss, "season", None),
            "max_floor": getattr(abyss, "max_floor", None),
            "total_stars": getattr(abyss, "total_stars", None),
        }
        print(f"  최고 층: {result['abyss']['max_floor']}")
        print(f"  총 별: {result['abyss']['total_stars']}")
    except Exception as e:
        print(f"  ⚠️ 나선비경 에러: {e}")

    # ============================================================
    # 3. 원석 일기
    # ============================================================
    print("\n=== 3. 원석 일기 ===")
    try:
        diary = await client.get_genshin_diary(uid)
        result["diary"] = {
            "current_primogems": diary.data.current_primogems,
            "current_moras": getattr(diary.data, "current_moras", None),
        }
        print(f"  이번 달 원석: {diary.data.current_primogems}")
    except Exception as e:
        print(f"  ⚠️ 일기 에러: {e}")

    # ============================================================
    # 4. 전체 유저 (통계 + 선계 + 탐험)
    # ============================================================
    print("\n=== 4. 전체 유저 정보 ===")
    try:
        full = await client.get_full_genshin_user(uid)

        # 통계
        if full.stats:
            s = full.stats
            result["stats"] = {
                "achievements": s.achievements,
                "days_active": s.days_active,
                "characters": s.characters,
                "anemoculi": s.anemoculi,
                "geoculi": s.geoculi,
                "dendroculi": s.dendroculi,
                "electroculi": s.electroculi,
                "hydroculi": s.hydroculi,
                "pyroculi": s.pyroculi,
                "lunoculi": s.lunoculi,
                "common_chests": s.common_chests,
                "exquisite_chests": s.exquisite_chests,
                "precious_chests": s.precious_chests,
                "luxurious_chests": s.luxurious_chests,
                "remarkable_chests": s.remarkable_chests,
                "unlocked_waypoints": s.unlocked_waypoints,
                "unlocked_domains": s.unlocked_domains,
            }
            print(f"  업적: {s.achievements}")
            print(f"  플레이 일수: {s.days_active}일")
            print(f"  캐릭터: {s.characters}명")

        # 선계
        if full.teapot:
            t = full.teapot
            result["teapot"] = {
                "level": t.level,
                "comfort": t.comfort,
                "comfort_name": t.comfort_name,
                "visitors": t.visitors,
                "items": t.items,
                "realms": [
                    {"name": r.name, "icon": r.icon} for r in (t.realms or [])
                ],
            }
            print(f"  선계: 레벨 {t.level}, 쾌적도 {t.comfort} ({t.comfort_name})")
            print(f"  선계 아이템: {t.items}개")

        # 탐험 (별바다 세계 포함)
        if full.explorations:
            explorations = []
            for e in full.explorations:
                explorations.append({
                    "name": e.name,
                    "explored": e.raw_explored,
                    "type": e.type,
                    "level": e.level,
                    "offerings": [
                        {"name": o.name, "level": o.level} for o in (e.offerings or [])
                    ],
                    "boss_list": [
                        {"name": b.name, "kills": b.kills} for b in (e.boss_list or [])
                    ],
                    "areas": [
                        {"name": a.name, "explored": a.raw_explored}
                        for a in (e.area_exploration_list or [])
                    ],
                })
            result["explorations"] = explorations
            print(f"  탐험 지역: {len(explorations)}개")

        # 나선 (full에 있으면 덮어쓰기)
        if full.abyss and not result.get("abyss"):
            result["abyss"] = {
                "season": getattr(full.abyss, "season", None),
                "max_floor": getattr(full.abyss, "max_floor", None),
                "total_stars": getattr(full.abyss, "total_stars", None),
            }

    except Exception as e:
        print(f"  ⚠️ 전체 유저 에러: {e}")

    # ============================================================
    # 5. 전체 캐릭터 (상세: 성유물/무기)
    # ============================================================
    print("\n=== 5. 전체 캐릭터 (상세) ===")
    try:
        chars_result = await client.get_genshin_detailed_characters(uid)
        chars = chars_result.characters
        result["characters"] = len(chars)
        print(f"  캐릭터 수: {len(chars)}")

        roster = []
        for c in chars:
            w = c.weapon
            roster.append({
                "key": c.name,
                "element": c.element,
                "rarity": c.rarity,
                "level": c.level,
                "constellation": c.constellation,
                "friendship": c.friendship,
                "weapon_type": safe_str(c.weapon_type),
                "weapon": {
                    "key": w.name,
                    "level": w.level,
                    "refinement": w.refinement,
                    "rarity": w.rarity,
                    "main_stat": w.main_stat.final if w.main_stat else None,
                    "sub_stat": w.sub_stat.final if w.sub_stat else None,
                } if w else None,
                "artifacts": [
                    {
                        "setName": a.set.name if a.set else None,
                        "slot": a.pos_name,
                        "pos": a.pos,
                        "level": a.level,
                        "rarity": a.rarity,
                        "mainStat": {
                            "type": a.main_stat.info.name if a.main_stat and a.main_stat.info else None,
                            "value": a.main_stat.value if a.main_stat else None,
                            "isPercent": "%" in (a.main_stat.value if a.main_stat else ""),
                        } if a.main_stat else None,
                        "substats": [
                            {
                                "type": s.info.name if s.info else None,
                                "value": s.value,
                                "isPercent": "%" in (s.value or ""),
                            }
                            for s in (a.sub_stats or [])
                        ],
                    }
                    for a in (c.artifacts or [])
                ],
            })
        result["roster"] = roster
    except Exception as e:
        print(f"  ⚠️ 캐릭터 에러: {e}")

    # ============================================================
    # JSON 저장
    # ============================================================
    out_dir = Path(__file__).parent / "output"
    out_dir.mkdir(exist_ok=True)
    out_path = out_dir / f"hoyolab_{uid}.json"
    out_path.write_text(
        json.dumps(result, ensure_ascii=False, indent=2, default=str),
        encoding="utf-8",
    )
    print(f"\n💾 저장: {out_path}")


asyncio.run(main())