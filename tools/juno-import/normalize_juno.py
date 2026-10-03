import json
from datetime import datetime, timezone
from pathlib import Path

RAW_DIR = Path("./tools/juno-import/raw")

OUTPUT_FILE = Path(
    "./tools/juno-import/wasteland-blueprints.json"
)


def load_blueprints():
    blueprints = []

    for filename in sorted(
        RAW_DIR.glob("*.json")
    ):
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

        if not item:
            print(
                f"WARNING: No item found in "
                f"{filename.name}"
            )
            continue

        blueprints.append(item)

    return blueprints


def normalize_blueprint(item):
    return {
        "id": item.get("id"),
        "name": item.get("name"),
        "kind": item.get("kind"),
        "updatedAt": item.get("updatedAt"),
        "metadata": item.get("metadata"),
        "itemCraftings": (
            item.get("itemCraftings")
            or []
        ),
        "itemReproductions": (
            item.get("itemReproductions")
            or []
        ),
    }


def main():
    raw_blueprints = load_blueprints()

    blueprints = [
        normalize_blueprint(item)
        for item in raw_blueprints
    ]

    blueprints.sort(
        key=lambda item: (
            item.get("name") or ""
        ).lower()
    )

    craftable_count = sum(
        1
        for blueprint in blueprints
        if blueprint["itemCraftings"]
    )

    non_crafting_count = (
        len(blueprints)
        - craftable_count
    )

    output = {
        "schemaVersion": 1,
        "generatedAt": datetime.now(
            timezone.utc
        ).isoformat(),
        "source": "Project Juno",
        "blueprintCount": len(
            blueprints
        ),
        "masterBlueprintCount": (
            craftable_count
        ),
        "excludedNonCraftingCount": (
            non_crafting_count
        ),
        "blueprints": blueprints,
    }

    OUTPUT_FILE.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    with OUTPUT_FILE.open(
        "w",
        encoding="utf-8",
    ) as file:
        json.dump(
            output,
            file,
            indent=2,
            ensure_ascii=False,
        )

    print(
        f"Raw blueprints loaded: "
        f"{len(raw_blueprints)}"
    )

    print(
        f"Blueprints written: "
        f"{len(blueprints)}"
    )

    print(
        f"Master Blueprint Collection: "
        f"{craftable_count}"
    )

    print(
        f"Non-crafting records retained: "
        f"{non_crafting_count}"
    )

    print()
    print(
        f"Output: {OUTPUT_FILE}"
    )


if __name__ == "__main__":
    main()