# Resource distribution GIS setup

Resource is a workflow inside **LPC Evac**, alongside Checkpoint and Custom Card. Select a zone to view it on the main map. Use **Check in** or **Distribute resources** above the map to open the scanner. There is no separate Map tab or zone confirmation screen.

## Create the table

The repository includes a table definition; it does not create an ArcGIS Online service automatically.

1. As a GIS administrator, create a **private hosted feature service** for resource distributions in the county organization. Use a **standalone nonspatial table**, named `Resource_Distributions`, with OBJECTID as its object ID field.
2. Add the table using `resource-table-definition.json` at the new service's administrative **addToDefinition** endpoint, or create the fields below in ArcGIS Pro and publish the table. The JSON's table ID is 0 for an empty service; use an unused ID when adding to an existing service.
3. Enable **Query and Add/Create**. Support pagination and ordering. Keep the service private and share only with the authorized operations group. Operators need permission to read prior distributions and add records. Editor tracking is recommended.
4. Create a **unique index on `distribution_id`**. This protects retry attempts and concurrent submissions from duplicate records. Verify the index exists after publishing.
5. Copy the actual table REST URL (ending in `/FeatureServer/<table ID>`) into `tableUrl` in `resource-config.js`. Do not substitute the checkpoint log URL. No token belongs in the config.
6. Use an authorized account to test a DL distribution, rescan its saved custom card, and verify both reference the same `card_id`. Confirm no checkpoint attendance record was added. Test a failed save/retry and CSV export.

## Fields

Use the exact lowercase names. The JSON includes aliases and lengths.

| Field | ArcGIS type | Length / purpose |
|---|---|---|
| OBJECTID | Object ID | System maintained |
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
- The selected zone identifies where aid is being tracked; this workflow does not verify recipient address membership or block aid for an address outside the selected zone. Checkpoint retains its address verification and override flow.
- One save records one resource line. After a confirmed save, choose another resource for the same recipient or scan the next person.
- Presets provide editable type, description, unit, and an initial quantity of **1**. These are entry defaults, not entitlements, standardized package sizes, or eligibility rules. Confirm the actual package size and issued quantity. Custom resource clears those fields for entry.
- Presets cover bottled water cases/gallons, food boxes, prepared/ready-to-eat meals, cleanup/hygiene kits, blankets, tarps, sandbags, diapers, formula, and pet food.
- Zone history loads all pages, displays the latest 100 distributions, and exports all loaded records. Refresh history before exporting updates from other operators.
- Saves require an authenticated ArcGIS session and a configured table. There is no local/offline queue. After an uncertain response, retry checks the retained distribution ID before writing again. The pending fields remain locked until that retry confirms the result.
