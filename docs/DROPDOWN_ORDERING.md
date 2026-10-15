# Alphabetical dropdown ordering

SearchablePicker now sorts every displayed list and filtered result A-Z using the shared alphabeticalOptions helper. This covers Actions (including procedure Actions), Blueprints, manual print identification, shopping resources, Warehouse inventory and Action resource fields.

Dynamic native selectors for Action options, Action field choices, Blueprint shopping-list destinations and the older camera chooser use the same ordering. Static Warehouse filter/sort menus, Off/On alarm settings and CSV/JSON export formats are alphabetical. Scanner diagnostic toggles were already Off/On; markup percentages were already ascending.

Ordering ignores case and name punctuation and compares embedded numbers naturally. Select/preferred-camera prompts stay first. Sorting copies the input, keeping catalog order, duplicate names, IDs, currently selected values and defined Action defaults intact.

Validation: 596 unit tests passed, lint and build passed. New helper tests cover case/punctuation/numbers, immutable source arrays and stable duplicate labels/IDs. Browser checks pass at Chrome 320/360/390/768/1280 and Firefox 390/1280. They verify open/filtered Action, Blueprint, Warehouse and resource pickers; nested Action selects and keyboard choices; native Warehouse/settings/export/shopping selectors; and unchanged Action, Warehouse, alarm, export and active-list defaults. Desktop/mobile Action-list screenshots inspected.
