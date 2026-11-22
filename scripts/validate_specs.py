#!/usr/bin/env python3
"""Validate Katsumeshi design JSON/schema and deterministic reference fixtures.

Usage:
  python -m pip install -r requirements-spec.txt
  python scripts/validate_specs.py

This checks SPEC FILES ONLY. It does not test game implementation or browser UI.
"""
from __future__ import annotations

import json
import math
from pathlib import Path

try:
    from jsonschema import Draft202012Validator, FormatChecker
except ImportError as exc:
    raise SystemExit(
        "Missing dependency: python -m pip install -r requirements-spec.txt"
    ) from exc

ROOT = Path(__file__).resolve().parent.parent
SPEC = ROOT / "spec"


def read_json(filename: str) -> dict:
    return json.loads((SPEC / filename).read_text(encoding="utf-8"))


def validate_schema(document: dict, schema: dict, label: str) -> None:
    Draft202012Validator.check_schema(schema)
    validator = Draft202012Validator(schema, format_checker=FormatChecker())
    errors = sorted(validator.iter_errors(document), key=lambda e: list(map(str, e.path)))
    if errors:
        preview = "\n".join(
            f"  {list(err.absolute_path)}: {err.message}" for err in errors[:15]
        )
        raise AssertionError(f"{label}: {len(errors)} schema errors:\n{preview}")


def require(predicate: bool, message: str) -> None:
    if not predicate:
        raise AssertionError(message)


def score_rank(score: int, thresholds: dict) -> str:
    for rank in ("SSS", "S", "A", "B", "C", "F"):
        if score >= thresholds[rank]:
            return rank
    raise AssertionError("rank thresholds incomplete")


def js_round(non_negative_number: float) -> int:
    # Game scores q+b may be nonnegative (q>=20,b>=-15).
    return math.floor(non_negative_number + 0.5)


def main() -> None:
    config = read_json("mvp_config.json")
    config_schema = read_json("mvp_config.schema.json")
    save_schema = read_json("mvp_save.schema.json")
    example = read_json("mvp_save_example.json")
    vectors = read_json("mvp_test_vectors.json")
    validate_schema(config, config_schema, "mvp_config")
    validate_schema(example, save_schema, "mvp_save_example")

    require(config["schema"] == "katsumeshi-mvp-config/v0.5", "config version")
    require(len(config["day1"]["orderTypes"]) == 8, "Day1 orders")
    types = config["day1"]["orderTypes"]
    require(all(types.count(x) == 2 for x in config["customer"]), "Day1 customer mix")
    require(sum(config["normalDay"]["arrivalWeights"].values()) == 100, "arrival weights")
    require(config["normalDay"]["queuedMax"] == 3, "queued cap")
    require(config["normalDay"]["cookingMax"] == 1, "cooking cap")
    require(config["normalDay"]["businessSeconds"] == 600, "business seconds")
    require(sum(config["cooking"]["stageMaxPoints"].values()) == 100, "score weights")
    require(config["sauce"]["maxPresets"] == 1 + config["sauce"]["customSlots"], "sauce slots")
    require(config["sauce"]["immutablePresetId"] == "basic", "basic is immutable")
    require(all(x == 1 for x in config["recipe"]["ingredientUnitsPerDish"].values()), "units per dish")
    unit_cost = sum(config["ingredientCostsYen"].values())
    require(unit_cost == 430, f"ingredient cost: {unit_cost}")
    require(config["recipe"]["priceYen"] == 980, "recipe price")
    require(config["economy"]["aidMinimumStockPerIngredient"] == 4, "aid minimum")
    require(config["starting"]["inventoryEachIngredient"] == 10, "starting inventory")
    require(config["day1"]["queueMax"] == 1, "Day1 queue cap")
    require(example["day"] == 1 and example["phase"] == "MORNING", "example phase")
    require(example["cashYen"] == config["starting"]["cashYen"], "example starting cash")
    require(set(example["inventory"].values()) == {10}, "example starting inventory")
    require(example["sauces"][0]["id"] == "basic", "example sauce")
    require(example["tutorialFirstServed"] is False, "tutorial first served initial")
    require(example["dailyLedger"]["upgradePurchasesYen"] == 0, "upgrade ledger")
    require(example["careerLedger"] == example["dailyLedger"], "initial lifetime ledger is empty")

    upgrade_ids = [u["id"] for u in config["upgrades"]]
    require(sorted(upgrade_ids) == ["chairs", "fryer"], "upgrade ids")
    for upgrade in config["upgrades"]:
        require(upgrade["unlockDay"] >= 2, "effective day rule")

    cases = vectors["fixtures"]
    require(len({case["id"] for case in cases}) == len(cases), "duplicate fixture IDs")
    by_id = {x["id"]: x for x in cases}
    day1 = by_id["mvp_day1_all_served"]
    require(day1["salesYen"] == 8 * config["recipe"]["priceYen"], "day1 sales")
    require(day1["consumedIngredientYen"] == 8 * unit_cost, "day1 cost")
    require(day1["overheadYen"] == config["economy"]["overheadYenPerDay"], "day1 overhead")
    profit = day1["salesYen"] - day1["consumedIngredientYen"] - day1["overheadYen"]
    cash = day1["startCashYen"] + day1["salesYen"] - day1["purchaseYen"] - day1["overheadYen"]
    require(profit == day1["operatingProfitYen"] == 2200, "day1 operating profit")
    require(cash == day1["endCashYen"] == 35640, "day1 ending cash")
    require(day1["remainingEachIngredient"] == 10 - 8, "day1 inventory")
    cancelled = by_id["mvp_one_cancel"]
    require(cancelled["wasteYen"] == cancelled["consumedIngredientYen"] == unit_cost, "waste is included")
    normal = by_id["normal_day_reputation30"]
    expected_n = min(max(10 + normal["reputation"] // 25, 10), 14)
    require(expected_n == normal["candidateArrivals"] == 11, "reputation arrival count")
    times = [20 + (i * 540 // expected_n) for i in range(expected_n)]
    require(times[0] == 20 and times[-1] < 600 and len(set(times)) == expected_n, "arrival schedule")

    for case in cases:
        if "quality" in case and "tasteDistance" in case:
            b = 15 - 0.3 * case["tasteDistance"]
            raw = case["quality"] + b
            result = max(0, min(100, js_round(raw)))
            require(result == case["finalScore"], f"{case['id']} score")
            require(score_rank(result, config["cooking"]["rankMinimum"]) == case["rank"], f"{case['id']} rank")

    rollover = by_id["day1_rollover_to_career"]
    require(rollover["salesBeforeCareerYen"] + rollover["salesCurrentDayYen"] == rollover["salesAfterCareerYen"], "rollover aggregation")
    require(rollover["dailySalesAfterResetYen"] == 0 and rollover["ordersAfterReset"] == 0, "rollover reset")

    fryer = by_id["upgrade_fryer_first_purchase"]
    require(fryer["completedDay"] + 1 >= fryer["unlockDay"], "fryer unlock")
    require(fryer["cashBeforeYen"] - fryer["investmentYen"] == fryer["cashAfterYen"], "fryer price")
    early = by_id["upgrade_chair_too_early"]
    require(early["completedDay"] + 1 < early["unlockDay"], "chairs not Day1")
    chair = by_id["upgrade_chair_first_purchase"]
    require(chair["completedDay"] + 1 >= chair["unlockDay"], "chairs Day2 close")
    aid = by_id["aid_only_missing_ingredient"]
    minimum = config["economy"]["aidMinimumStockPerIngredient"]
    require(
        aid["inventoryAfter"] == {k: max(v, minimum) for k, v in aid["inventoryBefore"].items()},
        "aid only replenishes deficient stock"
    )
    require(aid["cashBeforeYen"] == aid["cashAfterYen"], "aid costs no cash")
    cannot_aid = by_id["aid_not_available_if_can_buy"]
    missing_cost = sum(
        config["ingredientCostsYen"][key]
        for key, qty in cannot_aid["inventoryBefore"].items() if qty < 1
    )
    require(cannot_aid["cashBeforeYen"] >= missing_cost and not cannot_aid["aidAllowed"], "aid threshold")
    require(not by_id["day1_first_cancellation_rejected"]["accepted"], "first tutorial cancel guard")
    require(by_id["same_tick_expire_before_accept"]["orderStateAfter"] == "expired", "expiry precedes input")
    require(not by_id["basic_preset_immutable"]["accepted"], "immutable basic sauce")

    print(
        f"SPEC VALIDATION PASS: config, save example, {len(cases)} fixtures, "
        f"unit cost={unit_cost}, day1 profit={profit}, cash={cash}"
    )
    print("This is a design-data validation, not a gameplay or UI test.")


if __name__ == "__main__":
    main()
