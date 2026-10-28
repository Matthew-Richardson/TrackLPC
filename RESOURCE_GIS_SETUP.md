# Resource distribution GIS setup

Resource is a workflow inside **LPC Evac**, alongside Checkpoint and Custom Card. Choose resources and quantities, then use **Scan / Enter** to open the scanner. Resource has no map, zone selection, or address-to-zone check. Checkpoint retains the evacuation zone map.

## Create the table

The app is configured for the private county `LPCOEM_Resource` FeatureServer. It uses the signed-in ArcGIS session to discover the table and validate its schema before saving. This guide also covers creating or repairing a table.

1. As a GIS administrator, create a **private hosted feature service** for resource distributions in the county organization. Use a **standalone nonspatial table**, named `Resource_Distributions`, with a system-managed Object ID field. The supplied JSON names it OBJECTID; CSV publishing may name it FID or another supported name. The app reads its actual name from table metadata.
2. Add the table using `resource-table-definition.json` at the new service's administrative **addToDefinition** endpoint, or create the fields below in ArcGIS Pro and publish the table. The JSON's table ID is 0 for an empty service; use an unused ID when adding to an existing service.
3. Enable **Query and Add/Create**. Support pagination and ordering. Keep the service private and share only with the authorized operations group. Operators need permission to read prior distributions and add records. Editor tracking is recommended.
4. Create a **unique index on `distribution_id`**. This protects retry attempts and concurrent submissions from duplicate records. Verify the index exists after publishing.
5. `serviceUrl` in `resource-config.js` currently points to `LPCOEM_Resource`. The app uses the sole table, or an unambiguous table named Resource_Distributions/LPCOEM_Resource. If the service contains multiple tables, set `tableUrl` to the exact table REST URL (ending in `/FeatureServer/<table ID>`). This override takes precedence. Do not substitute the checkpoint log URL. No token belongs in the config.
6. Use an authorized account to test a DL distribution, rescan its saved custom card, and verify both reference the same `card_id`. Confirm no checkpoint attendance record was added. Test a failed save/retry and CSV export.

## Fields

Use the exact lowercase names. The JSON includes aliases and lengths.

| Field | ArcGIS type | Length / purpose |
|---|---|---|
| OBJECTID (or published system ID name) | Object ID | System maintained; discovered automatically |
| distribution_id | Text | 64; unique per distribution, retained on retry |
| card_id | Text | 64; existing shared custom-card registry ID |
| name | Text | 150; recipient name at distribution |
| address | Text | 500; recipient address |
| phone | Text | 40 |
| zone_id | Text | 40; evacuation-zone OBJECTID |
| zone_name | Text | 150 |
| incident | Text | 255; from selected zone |
| resource_type | Text | 80; category |
| resource_name | Text | 150; item/package description |
| preset_id | Text | 80; selected preset, or custom |
| quantity | Double | Positive quantity in the selected unit |
| unit | Text | 40; case, gallon, box, meal, kit, bag, etc. |
| distributed_at | Date | Actual distribution date/time |
| covers_through | Date | Optional end of coverage |
| recorded_at | Date | Time recorded by the app |
| operator_name | Text | 150 |
| scan_type | Text | 20; DL, Card, or Manual |
| notes | Text | 2000 |

Dates are entered in the device's local time zone and stored as epoch milliseconds. CSV exports dates in UTC ISO format. Set operational devices to the correct local time zone.

## Shared cards and operating behavior

- DL and manual entry reuse/create the same unique person record used by Checkpoint. First name, last name, and address are required. Custom QR cards are verified against the existing private registry, including active status and expiration; no separate resource card is needed.
- Driver-license number, DOB, and raw barcode are not stored. Resource records carry the opaque shared `card_id`.
- Resource saves require no zone. New records leave zone_id, zone_name, and incident blank; the fields remain for backward compatibility, so no CSV/schema migration is needed. Activity includes both new unzoned records and earlier zoned records, with a resource-type filter. Checkpoint retains its address verification and override flow.
- Before scanning, choose one or more resources and a quantity per person for each. Add/remove item rows and edit preset details or use Custom resource. Selections stay ready across recipients for the current page session.
- One save submits all selected items for the scanned recipient. Each item remains a separate table row with its own `distribution_id`, using the same `card_id` and distribution timestamp. No CSV or table-schema changes are required.
- A successful distribution creates or reuses one shared custom card and shows View custom card, Print to ZC300, and Save card PNG controls. No duplicate card is issued when an active matching person/card already exists. Printing is optional.
- Presets provide editable type, description, unit, and an initial quantity of **1**. These are entry defaults, not entitlements, standardized package sizes, or eligibility rules. Confirm the actual package size and issued quantity. Custom resource clears those fields for entry.
- Presets cover bottled water cases/gallons, food boxes, prepared/ready-to-eat meals, cleanup/hygiene kits, blankets, tarps, sandbags, diapers, formula, and pet food.
- Resource history loads all pages across zones, displays the latest 100 distributions in the scanner history, and exports all loaded records. Refresh history before exporting updates from other operators.
- Saves require an authenticated ArcGIS session and a configured table. There is no local/offline queue. Batch saves request `rollbackOnFailure=true`. After an uncertain or partial response, retry checks every retained item ID and writes only missing lines. Recipient, zone, quantities, dates, and notes are frozen for that pending attempt. Keep the screen open and retry until the result is confirmed. The next-person control stays disabled during an unresolved save.
- Custom-card registry creation must succeed before new distribution rows are submitted. If the resource service fails afterwards, the reusable card can already exist; retry reuses that card.
- After success, the save control is disabled to prevent repeating the same distribution. Use Scan another person for the next recipient. To change the resource selections, close the scanner and edit the resource selections on the dashboard.

## County inventory and optional operations

The Resource dashboard supports ongoing county inventory and named operations together. Supply is held by **resource + storage location + unit**. Each distribution consumes that supply once, whether it has an operation or is county routine assistance. Operations group activity; selecting one does not reserve, transfer, or subtract stock. Supply details and physical counts can be corrected using append-only revisions; older versions remain in the history. Partial stock transfers between locations are not automated.

### One-time shared-table setup

1. Add the two nonspatial tables in `resource-inventory-table-definition.json` to the **existing private LPCOEM_Resource FeatureServer** with its administrative `addToDefinition` endpoint. The supplied IDs are **1 and 2**; change them to unused IDs if these are occupied. Keep the existing distribution table and its data.
2. Keep the exact table names **Resource_Inventory** and **Resource_Operations**. The app discovers their actual IDs. Alternatively, set `inventoryTableUrl` and `operationsTableUrl` in `resource-config.js` to exact table URLs or a separate FeatureServer service URL. A service URL resolves the matching named table, or its sole nonspatial table, through the signed-in session.
3. Enable Query/Create for Resource_Inventory. Enable Query/Create/Update for Resource_Operations, so an operation can be closed or reopened. Enable pagination and ordering. Share with the same authorized operations group as the distribution table. Keep the service private. Enable editor tracking.
4. Verify **unique indexes** exist on `Resource_Inventory.entry_id` and `Resource_Operations.operation_id`. These protect retries from duplicate supplies or operations. Retain the unique index on distribution_id.
5. Refresh Resource Tracker. Use **County inventory** (command staff), then **Add a resource**, add each resource's type, description, unit, physical location, and starting quantity. Starting quantity means **the stock physically on hand now**, at the time you configure it. Historical untracked distributions are not deducted from newly configured stock.
6. Use **Receive stock** to append a receipt for an existing resource/location. Use a new stock entry for a different location or unit. Supply entries are immutable in the app; receipts preserve the audit history.
7. Optionally create an operation. Choose **Countywide / no operation** for routine assistance, or select a named operation before scanning. Closed operations remain visible for history and can be reopened; new distributions against a closed operation are blocked.

Until both tables are connected and validated, the existing resource entry workflow remains available, and the dashboard shows a setup message. Inventory totals are never stored only on one phone, and failed history reads are shown as unavailable rather than zero supply.

### Stored relationships and metrics

No fields need to be added to the existing Resource_Distributions table. A tracked resource's opaque `RINV-…` inventory_id is stored in its existing **preset_id** field. An optional `ROP-…` operation_id is stored in **incident**. Legacy preset_id and incident values are preserved. Stock entries and operations hold their readable names. CSV adds readable Location and Operation columns; distribution rows retain their original IDs for audit and retry checks.

- **Resource_Inventory** is an append-only ledger. A starting-supply row has record_type `stock` and entry_id equal to inventory_id. Restocks have record_type `receipt`, a unique entry_id, and the same inventory_id. Both carry quantity, recorded_at, operator_name, and optional notes. The starting row defines resource_type, resource_name, unit, and location.
- **Resource_Operations** contains operation_id, name, status (`Open` / `Closed`), created_at, and operator_name, plus the system OID.
- Remaining supply = starting quantity + receipts − confirmed linked distribution quantities, across **all operations**. Per-resource percentage = remaining / total received. Different units/resources are never combined into a single percentage. Select a resource in the dashboard to aggregate its locations; use **Filter dashboard & activity** to choose a location for its individual balance.
- People served counts distinct card_id values in the selected scope, falling back to name/address for older records. It counts cardholders/recipient records, not household members. Low/empty supply means 20% or less remaining. Operation/location/resource selectors also filter Activity.
- Use Scan / Enter to identify a person first. The recipient review shows resource pills and quantity fields directly. Select the supplies and amounts there before saving. The last successfully saved choices are remembered on that device, including across reloads; no recipient details are stored with this preference. Dashboard resource filters affect reporting; they do not hide other resources inside check-in. The location filter limits available supplies, while keeping previously selected items accessible. Phone, Date, Covers through, and Notes remain expanded. Zebra input uses the existing Checkpoint/Resource route.
- Availability is refreshed before a write. Insufficient observed supply blocks the save and permits changing the quantities before any distribution write. Once a write may have been submitted, the existing frozen-ID retry flow checks which lines already exist and submits only missing ones. Stock is calculated from those confirmed rows; retries never append a second stock deduction.
- Counts are shared and refresh with activity polling, but separate FeatureServer client calls are **not an atomic inventory reservation**. Simultaneous operators can both pass a pre-save availability check. An overdrawn balance is displayed rather than hidden; strict concurrent stock enforcement would require a transactional server-side reservation service.

### Connected county services

The app now connects Resource_Inventory and Resource_Operations from their separate private services, configured in resource-config.js. Their actual table IDs are discovered after ArcGIS sign-in. The distribution service remains LPCOEM_Resource. No public sharing is required. Query/Create must be enabled on Inventory; Query/Create/Update on Operations. Publish CSVs with Location set to None, then remove their schema sample data rows.

Two independent command-staff buttons follow the SAR in/out visual layout: **Operation setup** and **County inventory**. Operation setup shows selectable operation cards and a New operation action, with closed operations collapsed. Choosing or creating an operation closes setup and displays its name/status above the two buttons. County inventory offers Add a resource and Receive stock. Common-resource pills fill resource details; receiving stock starts with supply/location cards, followed by the delivery amount. These flows use no dropdown selectors. Dashboard location/resource filters are optional pills inside a collapsed filter panel. Done and successful setup actions collapse configuration again. This is a workflow label for command staff; ArcGIS sharing and editing permissions remain the authority for access.

### Activity scope and counts

The Activity badge counts the displayed resource-item rows after operation, location, resource, type and text filters. Selecting an operation shows only its records, including a selected closed operation. Countywide defaults to **Open operations**: all currently open operations plus routine distributions with no operation. **Open + closed** includes all records, including older records whose operation is no longer in the registry. Switching back to countywide via operation setup restores the open-operation view. These are reporting filters; physical supply balances always deduct all confirmed distributions, including closed operations. The scanner history follows the same operation/location/resource scope. CSV continues to include all loaded distribution records.

### Supply editing and inactive versions

County inventory now lists active supplies, plus a collapsed Inactive supplies group. Each supply supports Edit details, Update supply (a physical quantity-on-hand correction), Make inactive / Reactivate, and Revision & supply history. There is no delete action.

All inventory changes use addFeatures, never updateFeatures or deleteFeatures. The original stock/receipt rows remain unchanged. The existing schema supports the new record_type values; no new fields or inventory Update permission are required:

| record_type | Meaning |
|---|---|
| stock | Original starting supply, defining an inventory_id |
| receipt | Additional stock received |
| stock_update | New resource-name/category/location version; quantity is zero and does not change stock |
| stock_count | Corrected supply baseline; quantity equals the entered physical on-hand count plus all confirmed issued quantities at correction time |
| stock_inactive | New inactive version; keeps the balance and prevents further distribution/restocking |
| stock_active | New active version; restores availability without adding supply |

The newest metadata/status revision is the current version. Earlier definition/version rows are shown as superseded/inactive in the app; their stored attributes are not overwritten. Original rows need no backfill. Receipts remain immutable audit events. A stock_count baseline includes earlier receipts and corrections; only later receipts are added to it, and confirmed distributions are still subtracted once. Name/location/status edits do not reset the supply baseline and therefore cannot discard a concurrent receipt. Units remain fixed for an inventory_id; create a separate resource for a different unit or package size.

A revision's entry_id is retained on uncertain saves and checked before retrying. This prevents duplicate revisions. Activity refreshes keep the last confirmed table/count while fetching a replacement, instead of flashing zero every polling cycle. Checkpoint zone updates no longer clear Resource history or its row counter.
