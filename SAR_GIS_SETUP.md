# LPC SAR — GIS setup

The SAR workspace uses **three standalone hosted tables with no geometry**. It does not need a map, address layer, evacuation zone, or geocoding. Keep SAR tables separate from LPC Evac layers.

The selector beside the logo switches **LPC Evac mode / LPC SAR mode**. In SAR, **IN/OUT Checkpoint** provides event attendance; **Member cards** provides the registry and printable cards.

Until all three table URLs are configured, the app offers an explicitly labeled **Preview only** workspace. Preview records stay in memory in that browser tab; reload or Exit preview removes them. Preview records are not migrated into live tables. Use fictional information in preview.

## Tables and exact fields

Create these in a file geodatabase in ArcGIS Pro and publish them together as one hosted service, or publish them separately as hosted tables. One service containing three tables is convenient. Use the actual table IDs returned after publishing; do not assume their order. `OBJECTID` must be the standard Object ID field with that exact name. Additional ArcGIS-managed fields, including GlobalID and editor tracking, are fine.

Use the field **names**, not only the aliases, exactly as below. Text length is in characters. Dates are standard ArcGIS **Date** fields, not text or Date Only. The application sends dates as UTC epoch milliseconds and displays dates/times in the operator device's local time.

### `LPCSAR_Members`

| Field | ArcGIS type | Length | Purpose |
|---|---|---:|---|
| OBJECTID | Object ID | — | Managed by ArcGIS |
| member_id | Text | 64 | Permanent app-generated SAR member/card ID |
| name | Text | 150 | Member name |
| division | Text | 100 | Division, entered by SAR; no predefined list required |
| phone | Text | 40 | Phone; may be blank |
| status | Text | 20 | `Active` or `Inactive` |
| created_at | Date | — | Initial registration time |
| created_by | Text | 150 | Operator's entered name |
| updated_at | Date | — | Last member edit |

Enable **Query, Add, Update**. A saved member gets a reusable QR card even if it is never printed. Editing preserves `member_id`. Use Inactive instead of deleting someone whose attendance history must remain available. The QR contains only `{t:"sar-member", id:"SAR-MEM-…", v:1}`; the scanner reads current name, division, phone, and status from the private registry.

### `LPCSAR_Events`

| Field | ArcGIS type | Length | Purpose |
|---|---|---:|---|
| OBJECTID | Object ID | — | Managed by ArcGIS |
| event_id | Text | 64 | Permanent app-generated event ID |
| name | Text | 150 | Event name |
| event_type | Text | 30 | `Meeting`, `Training`, `Field mission`, or `Other` |
| event_date | Date | — | Event date/time; optional |
| location | Text | 255 | Optional plain-text meeting place; never mapped |
| notes | Text | 2000 | Optional event notes |
| status | Text | 20 | `Open` or `Closed` |
| created_at | Date | — | Creation time |
| created_by | Text | 150 | Operator's entered name |
| updated_at | Date | — | Last event edit |

Enable **Query, Add, Update**. Create one event per meeting, training, or field mission. Only open events accept attendance. The interface requires everyone to be checked out before closing an event. Closed events retain their history and can be reopened.

### `LPCSAR_Attendance`

| Field | ArcGIS type | Length | Purpose |
|---|---|---:|---|
| OBJECTID | Object ID | — | Managed by ArcGIS |
| record_id | Text | 64 | Unique app-generated movement/transaction ID |
| event_id | Text | 64 | Links to Events.event_id |
| member_id | Text | 64 | Links to Members.member_id |
| member_name | Text | 150 | Name snapshot at time of entry |
| division | Text | 100 | Division snapshot at time of entry |
| direction | Text | 3 | `IN` or `OUT` |
| check_time | Date | — | Movement time |
| operator_name | Text | 150 | Operator's entered name |
| notes | Text | 1000 | Optional attendance/assignment note |

Enable **Query and Add**. The app appends one row per IN/OUT movement; it does not edit or delete these rows. No address, coordinates, phone, or geometry is required on an attendance record. Historical name/division snapshots remain unchanged when a member is edited.

One person can attend many events and move IN/OUT more than once. Unique attendance is the number of distinct `member_id` values in the selected event, while Currently IN comes from each member's latest movement. Total check-ins counts IN rows. These are event attendance/accountability counts, not GPS tracking or a field deployment/task assignment system.

## Publication and settings

1. Publish the three tables. Confirm the REST endpoints identify each as a **Table**, not a point/polygon layer. Each table needs pagination and ordered queries, normally supported by ArcGIS Online hosted tables.
2. Add a **unique index** to `Members.member_id`, `Events.event_id`, and `Attendance.record_id`. Add ordinary indexes to `Attendance.event_id`, `Attendance.member_id`, and `Attendance.check_time` for performance. Unique record IDs support safe retries after an uncertain attendance save.
3. Enable the editing capabilities above, and editor tracking. The app's `created_by`/`operator_name` are entered display names; ArcGIS editor tracking records the authenticated account separately.
4. Share with the **SAR staff group** that needs access. Keep member/attendance data private; the public GitHub Pages interface does not require public data. Users need ArcGIS accounts with appropriate editing privileges and access to all three tables. Allow operators to query all SAR records, rather than only rows they personally created, so duplicate checks and attendance counts are complete.
5. Keep the current ArcGIS OAuth app/redirect configuration. This workspace uses the existing sign-in. Do not put passwords, tokens, or client secrets into GitHub.
6. Copy each table's complete REST URL, ending in `/FeatureServer/<table ID>`, into [sar-config.js](sar-config.js):

   ```js
   window.EZTAG_SAR_CONFIG = Object.freeze({
     members: 'https://YOUR_HOST/.../FeatureServer/MEMBERS_TABLE_ID',
     events: 'https://YOUR_HOST/.../FeatureServer/EVENTS_TABLE_ID',
     attendance: 'https://YOUR_HOST/.../FeatureServer/ATTENDANCE_TABLE_ID'
   });
   ```

   The examples are placeholders. Use the real URLs from your published service. URLs are safe to store; credentials are not. Reload the app after configuration. The app checks required fields and basic capabilities before enabling live entry.
7. Verify with a designated test member/event: create a member; scan the QR into the event; check IN; confirm a second IN is blocked; check OUT; confirm counts; close/reopen the event; export CSV; edit the member and confirm the same QR resolves the updated information. Test with the actual SAR editor account, not only the service owner.

No formal geodatabase relationship classes are required: the app joins through `event_id` and `member_id`. Avoid changing IDs or deleting referenced records. Optional coded-value domains must use the exact values listed above.

## Current limits

- Live writes have not been tested against your SAR service because it has not been created/configured yet.
- Preview is not offline operational storage. The app has no offline queue; online saves must succeed before attendance is confirmed.
- The interface rechecks member status, event status, and current attendance before saving and resolves uncertain attendance retries by `record_id`. Independent devices can still submit simultaneous changes. Use one check-in station per event/member queue until a server-side transaction/locking workflow is added if strict multi-station accountability is required.
- The app detects likely duplicate members by name + division, and does not silently combine people. Existing duplicate IDs cause scanning to stop for review. UUID indexes protect IDs; they do not enforce a human identity rule.
- Closing an event and adding attendance are separate server requests. Avoid editing/closing an event from another station during check-in.
- This is attendance and membership tracking; there is no map, location tracking, automated notification, or claim that a printed card grants access.

## Official references

- [ArcGIS Online hosted tables](https://doc.arcgis.com/en/arcgis-online/reference/table-layers.htm)
- [Data access and editing](https://doc.arcgis.com/en/arcgis-online/manage-data/data-access-and-editing.htm)
- [Manage hosted feature layer editing](https://doc.arcgis.com/en/arcgis-online/manage-data/manage-editing-hfl.htm)
- [Field and spatial indexes](https://developers.arcgis.com/documentation/portal-and-data-services/data-services/feature-services/field-and-spatial-indexes/)
- [LPCSAR branding reference](https://laplatasar.org/la-plata-county-weather/)

The official SAR logo is embedded in sar.js for reliable card printing and PNG export. SAR uses the logo red (#e81e2c) for interface accents and card headings; member lists use plain rows.
