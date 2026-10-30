# US place coordinates

Public-domain internal points from the U.S. Census Bureau 2024 Gazetteer: incorporated places, county subdivisions, and counties.

`scripts/build-place-index.ts` rebuilds `data/us-places.json` and `lib/state-bounds.ts` after those gazetteer files are unzipped into `data/source/`. The site reads the JSON when it builds. It does not call a geocoding service.
