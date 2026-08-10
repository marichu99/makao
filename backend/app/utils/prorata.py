from typing import List, Sequence, Tuple


def prorata_split(total_amount: float, weights: Sequence[Tuple[str, float]]) -> List[dict]:
    """Split `total_amount` across entries proportional to their weight (e.g. unit size_sqft).

    `weights` is a sequence of (key, weight) pairs. Falls back to an equal split if all
    weights are zero (e.g. unit sizes not configured). The last entry absorbs any rounding
    remainder so the allocated amounts always sum exactly to total_amount.
    """
    if not weights:
        return []

    total_weight = sum(w for _, w in weights)
    n = len(weights)

    results = []
    running_total = 0.0
    for index, (key, weight) in enumerate(weights):
        share = (weight / total_weight) if total_weight > 0 else (1 / n)
        if index == n - 1:
            amount = round(total_amount - running_total, 2)
        else:
            amount = round(total_amount * share, 2)
            running_total += amount
        results.append({"key": key, "share_percentage": round(share * 100, 4), "amount": amount})

    return results


def prorata_split_for_units(total_amount: float, units) -> List[dict]:
    """Convenience wrapper: splits `total_amount` across Unit model instances by unit_type.size_sqft.
    Units with no size configured weigh 0 (falls back to an equal split if none have a size)."""
    weights = [(unit.public_id, unit.unit_type.size_sqft or 0) for unit in units]
    return prorata_split(total_amount, weights)
