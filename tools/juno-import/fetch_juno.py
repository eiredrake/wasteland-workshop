import json
import os
import re
import time

from playwright.sync_api import sync_playwright

JUNO_URL = "https://db.larp.network/dystopia-rising/blueprints"

OUTPUT_DIR = "./tools/juno-import"
RAW_DIR = os.path.join(OUTPUT_DIR, "raw")
BLUEPRINT_LIST_FILE = os.path.join(
    OUTPUT_DIR,
    "blueprint-list.json",
)

DELAY_BETWEEN_BLUEPRINTS_SECONDS = 10
ITEM_TIMEOUT_SECONDS = 30

blueprint_list_captured = False
captured_item_ids = set()


def save_json(filename, data):
    os.makedirs(
        os.path.dirname(filename),
        exist_ok=True,
    )

    with open(
        filename,
        "w",
        encoding="utf-8",
    ) as file:
        json.dump(
            data,
            file,
            indent=2,
        )


def handle_response(response):
    global blueprint_list_captured

    if "/graphql" not in response.url:
        return

    try:
        request_data = response.request.post_data_json

        if not request_data:
            return

        operation_name = request_data.get(
            "operationName"
        )

        if operation_name == "GetItems":
            data = response.json()

            save_json(
                BLUEPRINT_LIST_FILE,
                data,
            )

            blueprint_list_captured = True

            print(
                "*** BLUEPRINT LIST CAPTURED ***"
            )

            return

        if operation_name != "GetItem":
            return

        data = response.json()

        item = (
            data.get("data", {})
            .get("organization", {})
            .get("item")
        )

        if not item:
            return

        item_id = item.get("id")

        if not item_id:
            return

        filename = os.path.join(
            RAW_DIR,
            f"{item_id}.json",
        )

        save_json(
            filename,
            data,
        )

        captured_item_ids.add(item_id)

        print(
            f"*** ITEM {item_id} CAPTURED ***"
        )

    except Exception as error:
        print(
            f"Could not process GraphQL response: "
            f"{error}"
        )


def load_blueprints():
    with open(
        BLUEPRINT_LIST_FILE,
        "r",
        encoding="utf-8",
    ) as file:
        data = json.load(file)

    return (
        data.get("data", {})
        .get("organization", {})
        .get("items", [])
    )


def item_already_exists(item_id):
    filename = os.path.join(
        RAW_DIR,
        f"{item_id}.json",
    )

    return os.path.exists(filename)


def page_looks_blocked(page):
    try:
        title = page.title().lower()

        body = page.locator("body").inner_text(
            timeout=3000
        ).lower()

        suspicious_text = [
            "verify you are human",
            "verification successful",
            "access denied",
            "attention required",
            "performing security verification",
        ]

        if "cloudflare" in title:
            return True

        return any(
            text in body
            for text in suspicious_text
        )

    except Exception:
        return False


def wait_for_item(page, item_id):
    deadline = (
        time.monotonic()
        + ITEM_TIMEOUT_SECONDS
    )

    while time.monotonic() < deadline:
        if page.is_closed():
            return False

        if item_id in captured_item_ids:
            return True

        page.wait_for_timeout(250)

    return False


def return_to_blueprint_list(page):
    page.go_back(
        wait_until="domcontentloaded",
        timeout=30000,
    )

    page.wait_for_timeout(1500)

    return not page_looks_blocked(page)


def find_blueprint_link(page, item_id):
    pattern = re.compile(
        rf"/dystopia-rising/blueprints/{item_id}$"
    )

    return page.get_by_role(
        "link"
    ).filter(
        has=page.locator(
            f'a[href$="/dystopia-rising/blueprints/{item_id}"]'
        )
    )


def collect_blueprints(page):
    blueprints = load_blueprints()
    total = len(blueprints)

    print()
    print(
        f"Found {total} blueprints."
    )
    print(
        f"Waiting {DELAY_BETWEEN_BLUEPRINTS_SECONDS} "
        "seconds between blueprints."
    )
    print()

    for index, blueprint in enumerate(
        blueprints,
        start=1,
    ):
        if page.is_closed():
            print(
                "Browser closed. Stopping."
            )
            return

        if page_looks_blocked(page):
            print()
            print(
                "*** SECURITY/ACCESS PAGE DETECTED ***"
            )
            print(
                "Stopping collector immediately."
            )
            return

        item_id = blueprint.get("id")
        name = blueprint.get(
            "name",
            "Unknown",
        )

        if not item_id:
            continue

        if item_already_exists(item_id):
            print(
                f"[{index}/{total}] "
                f"Already have {item_id} - {name}"
            )
            continue

        print(
            f"[{index}/{total}] "
            f"Opening {item_id} - {name}"
        )

        link = page.locator(
            f'a[href$="/dystopia-rising/blueprints/{item_id}"]'
        )

        try:
            if link.count() == 0:
                print(
                    "    Link not found. Stopping."
                )
                return

            link.first.scroll_into_view_if_needed()

            page.wait_for_timeout(500)

            link.first.click()

        except Exception as error:
            print(
                f"    Could not click link: {error}"
            )
            print(
                "    Stopping collector."
            )
            return

        if not wait_for_item(
            page,
            item_id,
        ):
            if page_looks_blocked(page):
                print()
                print(
                    "*** SECURITY/ACCESS PAGE DETECTED ***"
                )
            else:
                print(
                    f"    Timed out waiting for "
                    f"item {item_id}."
                )

            print(
                "Stopping collector."
            )
            return

        print(
            f"    Saved {item_id}.json"
        )

        if not return_to_blueprint_list(
            page
        ):
            print()
            print(
                "*** Could not safely return "
                "to blueprint list. ***"
            )
            print(
                "Stopping collector."
            )
            return

        print(
            f"    Waiting "
            f"{DELAY_BETWEEN_BLUEPRINTS_SECONDS} "
            "seconds..."
        )

        page.wait_for_timeout(
            DELAY_BETWEEN_BLUEPRINTS_SECONDS
            * 1000
        )

    print()
    print(
        "*** ALL BLUEPRINTS CAPTURED ***"
    )


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(
        headless=False
    )

    page = browser.new_page()

    page.context.on(
        "response",
        handle_response,
    )

    page.goto(JUNO_URL)

    print("Juno opened.")
    print(
        "Log in normally and wait for "
        "the blueprint list."
    )
    print(
        "The collector will start automatically "
        "after GetItems is captured."
    )

    while (
        browser.is_connected()
        and not blueprint_list_captured
    ):
        if page.is_closed():
            break

        page.wait_for_timeout(500)

    if (
        browser.is_connected()
        and not page.is_closed()
        and blueprint_list_captured
    ):
        print()
        print(
            "Blueprint catalog ready."
        )
        print(
            "Waiting 10 seconds before starting..."
        )

        page.wait_for_timeout(10000)

        collect_blueprints(page)

    print()
    print(
        "Collector finished."
    )

    while browser.is_connected():
        try:
            if page.is_closed():
                break

            page.wait_for_timeout(1000)

        except Exception:
            break