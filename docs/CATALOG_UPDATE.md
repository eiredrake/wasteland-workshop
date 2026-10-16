# Blueprint catalog refresh

Run commands from the repository root. The source is Project Juno. Use one
collector browser at a time and sign in or complete human verification normally.
The collector does not bypass source access checks.

## Full refresh and resume

For a new resumable refresh, first archive or move previous ignored raw captures
out of `tools/juno-import/raw`, so the directory starts empty. The files saved
there must all belong to the current refresh. Do not publish a mixture of an
unfinished refresh and old captures. `--refresh-all` deliberately overwrites
existing records, but does not itself track which older files were refreshed;
starting with an empty raw directory is required for reliable skip-based resume.

```powershell
python -u tools/juno-import/fetch_juno.py --refresh-all --delay 5 --profile tests/visual/actual/juno-refresh/resume-profile --close-when-done
```

After an interruption, resume the same refresh WITHOUT `--refresh-all`:

```powershell
python -u tools/juno-import/fetch_juno.py --delay 5 --profile tests/visual/actual/juno-refresh/resume-profile --close-when-done
```

Saved responses must contain the expected item ID and no GraphQL errors before
they are skipped. A corrupt or incomplete capture is fetched again. The default
minimum delay is five seconds between prints; increase it if required. HTTP 403,
HTTP 429 and GraphQL rate-limit responses stop collection without automatic retry.
If the source reports a limit, stop and wait for the source's cooldown before
resuming. Do not run parallel collectors. Browser profiles and raw responses are
local working material, not application assets or release files.

## Validate and publish

Confirm every ID in `blueprint-list.json` has a valid current raw response, and
review any missing, extra, added or removed IDs before normalization. Do not
publish a partial capture. Then run:

```powershell
python tools/juno-import/validate_juno_fields.py
python tools/juno-import/normalize_juno.py
python tools/juno-import/extract_referenced_items.py
```

Review the normalized content diff against `src/data/wasteland-blueprints.json`.
Preserve source IDs, recipes, component relationships and metadata. Copy the
reviewed `tools/juno-import/wasteland-blueprints.json` to
`src/data/wasteland-blueprints.json`. Reference item extraction is an inspection
artifact; it does not overwrite configured economics defaults or user prices.

Run the application tests, lint and production build through the existing
release workflow. Commit the catalog and importer changes, push clean main, then
use `scripts/release.ps1` and `scripts/deploy.ps1` with the next patch version.
Verify the public version and changed catalog content after deployment. Installed
PWAs receive the bundled catalog through their normal application update flow.

## v1.0.2 catalog refresh

The completed refresh contains all 655 source records: 607 craftable prints and
48 retained reference records. No catalog IDs were added or removed. Comparison
with the previous bundled catalog found 48 content-changed prints and 21 records
with timestamp-only changes.

Changes include Anti-Vehicle mechanics for Mountain Rifle and Mountain-Piercing
Gun; the Vambrace block call; vehicle armor, crew, hull, speed and turning data;
revised Zeppelin Tow Cabin, Piscis Expulsion Device, Guzzoline and Uni-Tire rules;
and virtual-only print/output naming corrections. Source text and identifiers
are preserved. Existing local user data and economics defaults are unchanged.

The source refresh was resumed from 245 saved records after a rate-limit stop.
The resumed run used one authenticated browser and a five-second delay between
prints. Complete source-ID coverage, capture validity, field types and normalized
catalog consistency were checked before bundling the new data.

Verification: 607 application tests, lint and production build passed. Focused
desktop (1280px) and phone (390px) checks verified seven updated print mechanics,
with cached offline reload passing at both widths. Collector checks covered
HTTP 403/429, GraphQL limits, login/query handshakes, empty source lists, corrupt
or mismatched captures and valid capture skipping.
