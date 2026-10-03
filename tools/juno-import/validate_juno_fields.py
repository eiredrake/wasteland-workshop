import json
from collections import Counter
from pathlib import Path

RAW_DIR = Path("./tools/juno-import/raw")


def value_type(value):
    if value is None:
        return "null"

    if isinstance(value, bool):
        return "boolean"

    if isinstance(value, int):
        return "integer"

    if isinstance(value, float):
        return "number"

    if isinstance(value, str):
        return "string"

    if isinstance(value, list):
        return "array"

    if isinstance(value, dict):
        return "object"

    return type(value).__name__


def record(counter, field_name, value):
    counter[field_name][value_type(value)] += 1


def print_results(title, counters):
    print()
    print(title)
    print("-" * len(title))

    for field_name in sorted(counters):
        print()
        print(field_name)

        for type_name, count in counters[
            field_name
        ].most_common():
            print(
                f"    {type_name}: {count}"
            )


def main():
    blueprint_fields = {}
    crafting_fields = {}
    component_fields = {}
    component_item_fields = {}
    final_product_fields = {}
    final_product_item_fields = {}

    groups = [
        blueprint_fields,
        crafting_fields,
        component_fields,
        component_item_fields,
        final_product_fields,
        final_product_item_fields,
    ]

    for group in groups:
        group.update()

    blueprint_fields = {
        field: Counter()
        for field in [
            "id",
            "name",
            "kind",
            "grade",
            "updatedAt",
            "metadata",
            "itemCraftings",
        ]
    }

    crafting_fields = {
        field: Counter()
        for field in [
            "id",
            "craftingTimeInMinute",
            "craftingMindCost",
            "craftingResolveCost",
            "craftingZone",
            "craftingSkills",
            "craftingComponents",
            "craftingFinalProducts",
        ]
    }

    component_fields = {
        field: Counter()
        for field in [
            "id",
            "acceptsExpiredItemWithinDays",
            "component",
            "amount",
        ]
    }

    component_item_fields = {
        field: Counter()
        for field in [
            "id",
            "name",
            "grade",
            "kind",
        ]
    }

    final_product_fields = {
        field: Counter()
        for field in [
            "id",
            "stack",
            "finalProduct",
        ]
    }

    final_product_item_fields = {
        field: Counter()
        for field in [
            "id",
            "name",
            "grade",
            "kind",
            "lifetimeAmount",
            "lifetimeUnit",
        ]
    }

    blueprint_count = 0
    crafting_count = 0
    component_count = 0
    final_product_count = 0

    for filename in sorted(
        RAW_DIR.glob("*.json")
    ):
        with filename.open(
            "r",
            encoding="utf-8",
        ) as file:
            data = json.load(file)

        blueprint = (
            data.get("data", {})
            .get("organization", {})
            .get("item")
        )

        if not blueprint:
            continue

        blueprint_count += 1

        for field_name in blueprint_fields:
            record(
                blueprint_fields,
                field_name,
                blueprint.get(field_name),
            )

        for crafting in (
            blueprint.get("itemCraftings")
            or []
        ):
            crafting_count += 1

            for field_name in crafting_fields:
                record(
                    crafting_fields,
                    field_name,
                    crafting.get(field_name),
                )

            for component_entry in (
                crafting.get(
                    "craftingComponents"
                )
                or []
            ):
                component_count += 1

                for field_name in component_fields:
                    record(
                        component_fields,
                        field_name,
                        component_entry.get(
                            field_name
                        ),
                    )

                component = (
                    component_entry.get(
                        "component"
                    )
                    or {}
                )

                for field_name in (
                    component_item_fields
                ):
                    record(
                        component_item_fields,
                        field_name,
                        component.get(
                            field_name
                        ),
                    )

            for final_entry in (
                crafting.get(
                    "craftingFinalProducts"
                )
                or []
            ):
                final_product_count += 1

                for field_name in (
                    final_product_fields
                ):
                    record(
                        final_product_fields,
                        field_name,
                        final_entry.get(
                            field_name
                        ),
                    )

                product = (
                    final_entry.get(
                        "finalProduct"
                    )
                    or {}
                )

                for field_name in (
                    final_product_item_fields
                ):
                    record(
                        final_product_item_fields,
                        field_name,
                        product.get(
                            field_name
                        ),
                    )

    print(
        f"Blueprints: {blueprint_count}"
    )
    print(
        f"Crafting recipes: {crafting_count}"
    )
    print(
        f"Component entries: {component_count}"
    )
    print(
        f"Final product entries: "
        f"{final_product_count}"
    )

    print_results(
        "Blueprint fields",
        blueprint_fields,
    )

    print_results(
        "ItemCrafting fields",
        crafting_fields,
    )

    print_results(
        "CraftingComponent fields",
        component_fields,
    )

    print_results(
        "Component item fields",
        component_item_fields,
    )

    print_results(
        "CraftingFinalProduct fields",
        final_product_fields,
    )

    print_results(
        "Final product item fields",
        final_product_item_fields,
    )


if __name__ == "__main__":
    main()