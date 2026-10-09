# Actions, Work Queue and Work History

Implemented in the existing application; no additional server, inventory transactions or character sheet tracking.

## User flow

Actions has its own searchable, category-filtered catalog and details. Add to Queue accepts either a Blueprint or Action. Actions do not require Blueprint ownership. Fixed-option Actions have no redundant option selector; multi-option definitions use the same generic form with text, resource, quantity and choice fields.

Work Queue lists unfinished Activities. Pending and paused details start collapsed; Working details start expanded. The existing compact timer remains available for the top pending Activity or current Working Activity. Tap starts/pauses/resumes; the existing long press opens timer settings. Another Activity cannot start until the user explicitly pauses current work. Reordering cannot move Working work. Completion does not start the next Activity.

Completed records appear only in Work History, newest first, collapsed by default. Expanding shows saved execution details. Notes can be edited; historical economic overrides are read-only. Records remain until explicitly deleted.

## Verified catalog and unresolved rules

The original verified Action is **Explore with Vaguely Trustworthy Map Set**. The bundled Project Juno data generated 2026-10-06, Blueprint #4800 / item #4370, specifies 30 minutes exploring the game site, one Gizmo use, and 5 Mind to gain one Forage card. The Action records these costs, equipment use, output and site access requirement. There is no standalone Forage card resource ID, so the output is a named snapshot. This is verification against the bundled item mechanics, not certification against a newly obtained current rulebook.

The user supplied authoritative clarification from the Dystopia Rising Live Player's Guide, 2.3.2026 (pages 25, 46, 48, 50, 51, 53). The catalog now also includes Repair, Basic/Proficient/Master Agricultural, Devoted Meditation, Basic Medical Healing and Assess Wounds, Proficient Medical Treat Mangle, and Master Medical Augment First Aid and Medical Checkup. Every definition records its source version/page.

Agricultural quantities resolve total duration, Mind and output; one Activity represents the whole gathering. Explicit session IDs enforce 60-minute, tier-specific Mind and six-herb limits and consistent herb selections. Named Herbs are entered explicitly and must be verified in season by the player. Foraging Card production is individual and has no herb-session constraint. An interruption button discards elapsed progress and pauses the full original gathering/repair duration for explicit resumption. Use this instead of ordinary pause when the role-play was interrupted; ordinary pause remains available and preserves time. Do not split a continuous gathering across separately completed history entries.

Medical additional Mind increases expenditure without extending Healing time. The owner confirms 1 total Mind per 10 Body, incrementing proportionally: 1 Mind restores 10 Body, 2 restores 20, 3 restores 30. Additional Mind configuration resolves the total expenditure and Body recovery, preserving one 10-minute timer. Mangle configuration resolves 5 Mind per limb and 10 minutes plus 2 per additional limb. Meditation offers a separate optional Fracture-removal choice costing 1 Resolve. First Aid augmentation records its six-hour/five-use limit as a benefit, not immediate healing or additional uses. No character resources are mutated.

Helscape Mine is now selectable following project-owner confirmation on 2026-10-08: Basic Foraging required, location Helscape Mine, one Basic/Uncommon/Rare Scrap per 10 minutes for 5/10/15 Mind respectively. No permissions, consumable inputs or expendable equipment uses. This definition cites the owner clarification rather than inventing a rulebook page. Disease Remission requires procedure-specific rules. The owner confirms that skill assistants (crafting, agricultural, etc.) always regain 2 Mind themselves; this supersedes the earlier clarification assigning recovery to the Target. Linked multi-participant Activities remain deferred; assistance duration and any additional procedure/Blueprint effects depend on the assisted work.

## Model and compatibility

`Activity` is the common persisted execution model; `Build` remains a compatibility alias. Existing internal names such as `blueprintName`, `recipe`, and the storage key remain to avoid replacing the timer/economics architecture. For Actions, `recipe` carries the resolved expenditure inputs, duration, Mind and Resolve used by the shared engine. Actions never receive a fabricated Blueprint ID or enter the Blueprint catalog.

Each Action Activity stores source type/ID/version, a cloned definition, selected option, resolved configuration, optional target/session ID, timer, notes and economic snapshot. Blueprint Activities retain their existing Blueprint/recipe snapshot and acquire source metadata. Live definition or economic default changes do not rewrite saved work. Recovery benefits are separate effects, not negative spending. Output/effect records describe expected results; they do not prove that a player completed an in-game transaction.

Generic session restrictions support maximum planned minutes, Mind, repetitions and a stable field selection. Restricted definitions require an explicit session ID. Admission checks include paused, pending and completed records sharing that ID; incompatible definitions/selections are rejected. Limits concern planned option costs, not extra elapsed time added through timer settings. Agricultural Actions use these session constraints. A full session management UI and authoritative rules for those future Actions remain deferred. Tool, site, skill and target eligibility is presented for the user to check; no character sheet is consulted.

Local queue schema is now version 2, at the existing `wasteland-workshop-build-queue` key. Version 1 records migrate with their order, status, deadlines, remaining time, notes and economics intact. Queue and history remain one persisted array, filtered by status, avoiding a second history storage lifecycle. Expired deadlines still reconcile through the existing elapsed-time engine.

Full backup schema is now version 3. Versions 1 and 2 are accepted and migrated. Export/import includes both source types, configuration, targets, sessions, saved execution definitions, notes and completed history. Active work is paused in the exported copy, as before. Unknown Action catalog IDs and valid unavailable resource references are preserved from snapshots. Malformed Action snapshots are rejected before replacement. App-owned master catalogs remain outside user backup data.

## Files

- `src/features/actions/`: Action model, verified catalog, validation/session service, catalog/details UI, generic queue picker, themed CSS and regression tests.
- `src/features/builds/`: shared Activity model/service/repository, Work Queue, Work History, saved details and history editing.
- `src/App.tsx`: navigation and both source workflows.
- `src/components/BuildCraftTimer`, `BuildStatusBadge`, `CraftTimer`, `TimerConfiguration`: shared timer integration and Activity wording; existing gesture/timer machinery retained.
- `src/features/backup/`: schema 3 migration, validation, persistence and user-facing labels.
- Existing queue, timer and backup tests updated for explicit-pause behavior and new schema. Earlier unread-Blueprint settings changes in the working tree were preserved.

## Validation

- 358 automated tests passing across 24 files, including 27 Action tests.
- Lint and production build passing.
- Phone-sized Chromium (390 x 844): add, pause, queue another Action, timer settings cancel/adjustment, completion to History, reload persistence; no horizontal overflow or JavaScript errors.
- Desktop Chromium (1280 x 900): queue two Actions, pause, edit notes, export schema 3 backup and restore into a fresh browser context; both Activities and notes preserved.
- Automated tests additionally cover mixed Blueprint/Action queues, legacy migration, option/configuration validation, session restrictions, stable snapshots, history ordering, unknown references and malformed restore rejection.

These browser checks used isolated test storage and did not replace real user data. Actual Android/iPhone gesture, background and locked-screen testing remains necessary. Existing browser suspension/audio limitations remain; this work adds no server push or native scheduling.

Manual phone review: add a Blueprint and an Action; pause before switching; test long press and time adjustment; complete one and inspect History; edit history notes; export and restore a backup on a disposable browser profile.
