import json
from collections import Counter
from pathlib import Path

RAW_DIR = Path("./tools/juno-import/raw")


def load_items():
    items = []

    for filename in sorted(RAW_DIR.glob("*.json")):
        with filename.open(
            "r",
            encoding="utf-8",
        ) as file:
            data = json.load(file)

        item = (
            data.get("data", {})
            .get("organization", {})
            .get("item")
        )

        if item:
            items.append(item)

    return items


def print_counter(title, counter):
    print()
    print(title)
    print("-" * len(title))

    for value, count in counter.most_common():
        print(f"{value!r}: {count}")


def main():
    items = load_items()

    print(f"Blueprint files loaded: {len(items)}")

    ids = [item.get("id") for item in items]

    print(f"Unique blueprint IDs: {len(set(ids))}")

    kinds = Counter(
        item.get("kind")
        for item in items
    )

    grades = Counter(
        item.get("grade")
        for item in items
    )

    visibilities = Counter(
        item.get("visibility")
        for item in items
    )

    crafting_counts = Counter(
        len(item.get("itemCraftings") or [])
        for item in items
    )

    reproduction_counts = Counter(
        len(item.get("itemReproductions") or [])
        for item in items
    )

    parts_counts = Counter(
        len(item.get("parts") or [])
        for item in items
    )

    skill_shapes = Counter()

    component_kinds = Counter()
    component_grades = Counter()

    final_product_kinds = Counter()
    final_product_grades = Counter()

    for item in items:
        for crafting in item.get(
            "itemCraftings"
        ) or []:
            skills = crafting.get(
                "craftingSkills"
            )

            skill_shapes[
                type(skills).__name__
            ] += 1

            for component_entry in crafting.get(
                "craftingComponents"
            ) or []:
                component = (
                    component_entry.get(
                        "component"
                    ) or {}
                )

                component_kinds[
                    component.get("kind")
                ] += 1

                component_grades[
                    component.get("grade")
                ] += 1

            for final_entry in crafting.get(
                "craftingFinalProducts"
            ) or []:
                product = (
                    final_entry.get(
                        "finalProduct"
                    ) or {}
                )

                final_product_kinds[
                    product.get("kind")
                ] += 1

                final_product_grades[
                    product.get("grade")
                ] += 1

    print_counter(
        "Blueprint kinds",
        kinds,
    )

    print_counter(
        "Blueprint grades",
        grades,
    )

    print_counter(
        "Visibility",
        visibilities,
    )

    print_counter(
        "Crafting recipes per blueprint",
        crafting_counts,
    )

    print_counter(
        "Reproduction records per blueprint",
        reproduction_counts,
    )

    print_counter(
        "Parts records per blueprint",
        parts_counts,
    )

    print_counter(
        "craftingSkills Python types",
        skill_shapes,
    )

    print_counter(
        "Component kinds",
        component_kinds,
    )

    print_counter(
        "Component grades",
        component_grades,
    )

    print_counter(
        "Final product kinds",
        final_product_kinds,
    )

    print_counter(
        "Final product grades",
        final_product_grades,
    )


if __name__ == "__main__":
    main()