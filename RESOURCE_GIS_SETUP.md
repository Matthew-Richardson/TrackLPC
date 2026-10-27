# Resource distribution GIS setup

Resource is a workflow inside **LPC Evac**, alongside Checkpoint and Custom Card. Choose resources and quantities, then use **Distribute resources** to open the scanner. Resource has no map, zone selection, or address-to-zone check. Checkpoint retains the evacuation zone map.

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
- After success, the save control is disabled to prevent repeating the same distribution. Use Scan another person for the next recipient. To change the resource selections, close the scanner and edit them above the map.
