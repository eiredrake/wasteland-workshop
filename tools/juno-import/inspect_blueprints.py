import json
from collections import Counter
from pathlib import Path

RAW_DIR = Path("./tools/juno-import/raw")


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

    skill_values = Counter()
    no_crafting = []

    for blueprint in blueprints:
        craftings = (
            blueprint.get("itemCraftings")
            or []
        )

        if not craftings:
            no_crafting.append({
                "id": blueprint.get("id"),
                "name": blueprint.get("name"),
                "reproductions": len(
                    blueprint.get(
                        "itemReproductions"
                    ) or []
                ),
                "blueprintForCraftings": blueprint.get(
                    "blueprintForCraftings"
                ) or [],
            })

            continue

        for crafting in craftings:
            skills = crafting.get(
                "craftingSkills"
            )

            if skills is None:
                skill_values["<NULL>"] += 1
            else:
                skill_values[skills] += 1

    print(
        f"Blueprints examined: {len(blueprints)}"
    )

    print()
    print("Crafting skill values")
    print("---------------------")

    for value, count in skill_values.most_common():
        print(
            f"{count:4}  {value!r}"
        )

    print()
    print(
        f"Blueprints with no crafting recipe: "
        f"{len(no_crafting)}"
    )
    print(
        "--------------------------------------"
    )

    for blueprint in sorted(
        no_crafting,
        key=lambda item: (
            item["name"] or ""
        ).lower(),
    ):
        print()
        print(
            f"{blueprint['id']} - "
            f"{blueprint['name']}"
        )
        print(
            f"    Reproduction records: "
            f"{blueprint['reproductions']}"
        )

        linked = blueprint[
            "blueprintForCraftings"
        ]

        if linked:
            print(
                "    Blueprint-for-craftings:"
            )

            for item in linked:
                print(
                    f"        {item.get('id')} - "
                    f"{item.get('name')}"
                )


if __name__ == "__main__":
    main()