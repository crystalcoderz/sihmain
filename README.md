# Jan Report

AI-powered logistics and accessibility intelligence prototype for SIH26002 / MDoNER.

## Run locally

1. Run `npm install`.
2. With the active GCP account, run `npm run dev:gcp`. It retrieves the dedicated browser-restricted development key at runtime, without writing it to `.env` or source control.
3. Alternatively, copy `.env.example` to `.env`, add a browser-restricted `VITE_GOOGLE_MAPS_API_KEY`, then run `npm run dev`.

`npm run build:gcp` creates the production bundle with the local GCP development key; `npm run build` creates the verified generic bundle in `dist/`.

## Demo flow

Dashboard → Live Map → Route Intelligence → Vehicles → Field Reports. Turn on **Offline simulation**, submit a critical landslide report, then choose **Restore connection**. The IndexedDB queue uses client-generated IDs and synchronizes into the same incident, risk, route, alert, district, and emergency state used everywhere else.

## Integration boundaries

- Google Maps is loaded through `GoogleMapProvider`; the app remains usable with a clear setup message until a key is supplied.
- Routes, weather, GPS, and risk scores are explicitly deterministic demo data where not connected to an approved provider.
- IndexedDB is the field-reporting persistence adapter. The provider-neutral PostgreSQL handoff schema is in `docs/database-schema.sql`.
- Routing, geocoding, weather, authentication, database hosting, photo storage, notifications, and deployment have not been selected or contacted.
"# sihmain" 
"# sihmain" 
