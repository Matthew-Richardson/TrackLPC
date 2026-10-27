# EZtag — La Plata County

[![Last commit](https://img.shields.io/github/last-commit/Matthew-Richardson/TrackLPC)](https://github.com/Matthew-Richardson/TrackLPC/commits/main/)
[![Top language](https://img.shields.io/github/languages/top/Matthew-Richardson/TrackLPC)](https://github.com/Matthew-Richardson/TrackLPC)
[![Repository size](https://img.shields.io/github/repo-size/Matthew-Richardson/TrackLPC)](https://github.com/Matthew-Richardson/TrackLPC)
[![Open issues](https://img.shields.io/github/issues/Matthew-Richardson/TrackLPC)](https://github.com/Matthew-Richardson/TrackLPC/issues)

Browser-based evacuation checkpoint and Search & Rescue attendance tools for La Plata County, Colorado. The interface is hosted on GitHub Pages; operational records are stored in secured ArcGIS Online services.

**[Open EZtag](https://matthew-richardson.github.io/TrackLPC/)** · **[SAR GIS setup](SAR_GIS_SETUP.md)** · **[Deployment history](https://github.com/Matthew-Richardson/TrackLPC/actions)** · **[Report an issue](https://github.com/Matthew-Richardson/TrackLPC/issues)**

## Workspaces

Use the selector beside the logo to switch between **LPC Evac mode** and **LPC SAR mode**.

| Workspace | Functions | Data requirements |
| --- | --- | --- |
| LPC Evac | Zone selection and map confirmation, driver-license/EZcard scanning, address checks, IN/OUT logging, custom cards, registry search, and CSV exports | Evacuation zones, county GIS reference data, checkpoint log, and custom-card registry |
| LPC SAR | Meeting, training, and field-mission events; IN/OUT Checkpoint attendance; member cards with Name, Division, and Phone; CSV exports | Three standalone tables: Members, Events, and Attendance. No geometry required |

Evac uses county blue. SAR uses its logo red. Both workspaces share navigation, forms, and plain registry rows.

## Current status

- Evac service endpoints are configured in `index.html`; access depends on the signed-in account and service settings.
- SAR table URLs in `sar-config.js` are currently blank. Live SAR saving stays disabled until all three are connected and pass the app's schema checks.
- **Try preview** offers an in-memory SAR workflow. Use fictional information: preview records disappear on reload or Exit preview and are not uploaded into live tables.
- GitHub Pages builds/deploys the static site. A successful Pages deployment confirms publication, not successful GIS operations.

## Using the application

### LPC Evac

1. Enter the operator name and sign in with ArcGIS Online.
2. Open **IN/OUT Checkpoint**, select an evacuation zone, review its boundary, and confirm the zone.
3. Scan a driver's license or existing EZcard, or enter the person's information manually. The app checks the address against the selected zone. An outside-zone result can be reviewed through the override workflow.
4. Confirm IN or OUT, enter the requested phone/notes, and save the visit.

The checkpoint save creates or reuses a registry card; printing is optional. Each new visit links to the person's opaque card ID. This does not backfill older checkpoint records.

In **Custom Card**, scan a license to populate details or enter them manually. Existing-card suggestions require a matching last name and begin with the site number plus a partial street. Results show saved addresses for confirmation. The save-time identity check uses the full normalized name and street/unit; a partial suggestion does not automatically merge people.

The registry supports searching, filtering, editing name/phone, reprinting, creating a card for another person, and deleting cards. Deleting a registry card makes its printed QR fail subsequent approval checks.

### LPC SAR

1. Switch to **LPC SAR mode**. Connect the SAR tables first, or choose the labeled preview.
2. Under **Member cards**, save the member's Name, Division, and optional Phone. The app assigns a reusable member ID and creates a card preview. Print or save a PNG if needed.
3. Under **IN/OUT Checkpoint**, create or select an event. Supported event types are Meeting, Training, Field mission, and Other.
4. Scan a SAR member QR or select a member, then confirm Check IN or Check OUT. Export the event attendance log as needed.

Closed events retain their history and can be reopened. The interface requires checked-in members to be checked out before closing an event. Member records can be marked Inactive without removing attendance history.

| SAR attendance measure | Meaning |
| --- | --- |
| Currently IN | Members whose latest movement in the selected event is IN |
| Unique attendees | Distinct member IDs recorded in that event |
| Total check-ins | Number of IN entries, including repeat arrivals |

The Evac card registry count includes unprinted cards and may include nonresidents. It is not a verified count of unique LPC residents.

## Requirements

- A current browser with JavaScript enabled and network access to the configured services/CDNs.
- An ArcGIS Online account with access and editing privileges for the appropriate private tables.
- A registered ArcGIS OAuth application and matching redirect URI.
- HTTPS and camera permission for phone-camera scanning. A compatible USB barcode scanner or manual entry can also be used.
- For physical cards, a suitable card printer. The interface includes ZC300 print actions and PNG export.

No npm install, build step, database server, or application backend is required to serve this repository.

## Configuration

### ArcGIS sign-in

The main application's OAuth settings are near the top of the script in [`index.html`](index.html):

| Setting | Purpose |
| --- | --- |
| `AGOL_CLIENT_ID` | Registered ArcGIS application client ID |
| `AGOL_PORTAL` | ArcGIS sharing REST endpoint |
| `AGOL_REDIRECT_URI` | Registered return URL; currently the hosted `/TrackLPC/index.html` |
| `AGOL_OAUTH_OPTIONS` | PKCE, session expiration, and related sign-in options |

The app uses a browser identity manager, with redirect sign-in on mobile and popup sign-in on desktop. [`callback.html`](callback.html) is also present as an OAuth callback page with its own settings. If changing the hosting URL or OAuth app, review both files and the registered redirect URIs together.

Client IDs and service URLs are configuration, not secrets. Do not commit passwords, access tokens, client secrets, or private record exports.

### Evac services

These settings are in `index.html`:

| Setting | Purpose |
| --- | --- |
| `EVAC_URL` | Evacuation zones |
| `LOG_URL` | Checkpoint visits |
| `CARD_URL` | Custom-card/person registry |
| `PARCEL_URL` / `ADDR_URL` | Parcel/address queries |
| `COUNTY_REFERENCE_URL` | County roads, parcel boundaries, and address-number overlays |
| `GEOCODE_URL` | Address matching |

The map uses OpenStreetMap tiles and county GIS reference layers. Address-number overlays are limited to close zoom levels.

The checkpoint-log field named `license_num` stores the **EZcard ID**, not a driver's-license number. Preserve this distinction when configuring schemas, exports, or integrations.

### SAR tables

Follow **[SAR_GIS_SETUP.md](SAR_GIS_SETUP.md)** for exact field names, types, text lengths, indexes, relationships, and editing settings.

| Table | Key | Permissions used by the app |
| --- | --- | --- |
| `LPCSAR_Members` | `member_id` | Query, Add, Update |
| `LPCSAR_Events` | `event_id` | Query, Add, Update |
| `LPCSAR_Attendance` | `record_id`, linked by `event_id` and `member_id` | Query, Add |

Add the actual REST table URLs to [`sar-config.js`](sar-config.js). Each URL must end in `/FeatureServer/<table ID>`. Keep the tables private and share them with the staff group that needs access. Reload the application after updating configuration.

## Local development

```bash
git clone https://github.com/Matthew-Richardson/TrackLPC.git
cd TrackLPC
python3 -m http.server 8000
```

Open `http://localhost:8000/`. Use a web server rather than opening the HTML as a `file://` URL.

The checked-in OAuth redirect points to the hosted site. Full local sign-in requires a development redirect registered in ArcGIS and matching local configuration. Do not change the production redirect solely to inspect styling.

## Deployment

The current site is served by GitHub Pages. Changes pushed to `main` trigger the repository's Pages build/deployment. Review progress under **[Actions](https://github.com/Matthew-Richardson/TrackLPC/actions)**.

Keep `index.html`, the CSS files, and SAR scripts together at the site root. For another repository or hosting path, update OAuth redirects and any absolute documentation links as well as the service configuration.

## Repository contents

| File | Purpose |
| --- | --- |
| `index.html` | Main application, Evac workflows, mapping, scanning, and sign-in |
| `app.css` | Shared layout, workspace colors, and registry styling |
| `sar.js` | SAR events, attendance, members, scanning, and member-card rendering |
| `sar.css` | SAR workspace layout and components |
| `sar-config.js` | SAR REST table URL configuration |
| `SAR_GIS_SETUP.md` | SAR database schema and setup guide |
| `callback.html` | Additional ArcGIS OAuth callback page |
| `EZcard_Privacy_Data_Demo.html` | Standalone privacy/data-use demonstration |
| `README.md` | Project overview and operating/development reference |

The application loads Leaflet, Esri Leaflet, ArcGIS REST Request, QR-code generation, and barcode-detector libraries from CDNs. There is no package manifest in the repository.

## Data handling

- Driver-license scans are parsed for operational information. The application does not retain the license number, date of birth, raw barcode, or license image in its records.
- Evac address checks send the entered address to the configured ArcGIS geocoding service.
- Evac and SAR QRs contain an opaque card/member ID. Current details are retrieved from the appropriate registry after sign-in; SAR and Evac card types are separate.
- Operational records are stored in the configured ArcGIS services. A public interface does not require making those services public.
- ArcGIS editor tracking should be enabled. The operator name entered in the app is a display name, not a replacement for an authenticated-account audit trail.

## Verification and limits

Development checks have covered script syntax, DOM workflows, generated SAR QR decoding, duplicate matching, mocked ArcGIS requests, and uncertain-save retries. An automated application test suite is not currently checked into this repository, and no test-coverage percentage is claimed.

Before operational use or after changing services, test with designated test records and the actual editor account: sign in, create/reuse a card, scan it, record IN/OUT, verify counts, export CSV, and test the physical printer.

SAR live-service testing is pending table configuration. The application has no offline save queue. Preview data is temporary. Independent stations can still submit simultaneous changes; client-side duplicate checks are not a server-side transaction or locking system. SAR attendance is not GPS tracking or a mission assignment system.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Sign-in fails or returns to the wrong page | OAuth client ID, registered redirect URI, matching page settings, and popup/redirect behavior |
| SAR only offers preview | All three table URLs in `sar-config.js`, required fields, and service capabilities |
| Records cannot be read or saved | Current sign-in, group sharing, account editing privileges, and network/service availability |
| Phone camera does not start | HTTPS, camera permission, supported browser, and another app/tab holding the camera |
| A card is not approved | Correct workspace/card type, registry presence, Active status, and expiration where applicable |
| Existing-card suggestions do not appear | Enter the matching last name plus site number and part of the street; check the saved street/unit formatting |
| Address numbers are missing | Zoom in closer and check the map's Layers control |
| Card printing is clipped or spans pages | CR-80 paper, Landscape, Actual size/100%, no margins, headers/footers off, and one copy |

## Support and contributions

Use **[GitHub Issues](https://github.com/Matthew-Richardson/TrackLPC/issues)** for reproducible bugs and feature requests. Include the workspace, browser/device, steps, and expected versus actual result. Use fictional examples and redact personal information, tokens, and operational records.

For changes, use a focused branch/pull request, preserve existing field names and IDs, and describe the validation performed. Coordinate schema changes with the table owner before changing live data.

Maintained in the [Matthew-Richardson/TrackLPC](https://github.com/Matthew-Richardson/TrackLPC) repository.

## License and branding

No `LICENSE` file is currently included. Contact the maintainer about reuse and redistribution. County and SAR names/logos are organizational branding; this repository does not grant separate permission to reuse them.
