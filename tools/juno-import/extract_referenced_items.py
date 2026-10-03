import json
from collections import defaultdict
from pathlib import Path

RAW_DIR = Path("./tools/juno-import/raw")
OUTPUT_FILE = Path(
    "./tools/juno-import/referenced-items.json"
)


def load_blueprints():
    blueprints = []

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
            blueprints.append(item)

    return blueprints


def main():
    blueprints = load_blueprints()

    referenced_items = {}
    used_by_blueprints = defaultdict(set)
    total_component_uses = defaultdict(int)

    for blueprint in blueprints:
        blueprint_id = blueprint.get("id")

        for crafting in blueprint.get(
            "itemCraftings"
        ) or []:

            for component_entry in crafting.get(
                "craftingComponents"
            ) or []:

                component = (
                    component_entry.get(
                        "component"
                    ) or {}
                )

                component_id = component.get("id")

                if not component_id:
                    continue

                if component_id not in referenced_items:
                    referenced_items[component_id] = {
                        "id": component_id,
                        "name": component.get("name"),
                        "kind": component.get("kind"),
                        "grade": component.get("grade"),
                    }

                used_by_blueprints[
                    component_id
                ].add(blueprint_id)

                total_component_uses[
                    component_id
                ] += 1

    output = []

    for component_id, component in referenced_items.items():
        output.append({
            **component,
            "usedByBlueprints": len(
                used_by_blueprints[component_id]
            ),
            "totalRecipeUses": total_component_uses[
                component_id
            ],
        })

    output.sort(
        key=lambda item: (
            item.get("kind") or "",
            item.get("name") or "",
        )
    )

    with OUTPUT_FILE.open(
        "w",
        encoding="utf-8",
    ) as file:
        json.dump(
            output,
            file,
            indent=2,
        )

    print(
        f"Blueprints examined: {len(blueprints)}"
    )

    print(
        f"Unique referenced items: {len(output)}"
    )

    print()
    print("Referenced item kinds")
    print("---------------------")

    kinds = {}

    for item in output:
        kind = item.get("kind")

        kinds[kind] = kinds.get(
            kind,
            0,
        ) + 1

    for kind, count in sorted(
        kinds.items(),
        key=lambda pair: str(pair[0]),
    ):
        print(
            f"{kind!r}: {count}"
        )

    print()
    print(
        f"Output written to: {OUTPUT_FILE}"
    )


if __name__ == "__main__":
    main()