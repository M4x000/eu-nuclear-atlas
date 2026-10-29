# EU Nuclear Atlas

Static atlas and engineering-skills explorer for the European nuclear sector.
The interface is in Italian. This independent educational project was developed
with AI assistance and is not affiliated with the organisations listed.

[Open the live atlas](https://m4x000.github.io/eu-nuclear-atlas/)

## Public edition

**270 organisations (268 EU + Switzerland; 2 optional UK entries) · 20 real historical vacancy records.** The complete editorial employer directory is included. Vacancy records are
limited to F4E and INFN sources with documented reuse conditions. Employer
records are original factual summaries and classifications, not copies of
third-party websites or vacancy databases. Four profiles have been reduced
to basic information from alternative sources and are marked incomplete. It is not a census of the European job market. Missing sectors
or skills do not imply missing demand. Vacancy availability has not been
rechecked for this release; each record keeps its original verification date.

The larger private research archive is not distributed. No personal profile,
private work history, research backups or source-document PDFs are included.

## What the application demonstrates

- Interactive map with filters, clustering and an offline map fallback.
- Normalised roles, skills, software and standards with source evidence.
- Rankings calculated from the selected sample, with filters and denominators.
- Editable records, validated JSON import/export, local backups and shortlist.
- A mechanical-engineering perspective on fusion and research infrastructure.

This is a tool for organising and examining evidence, not a mechanical design
calculation or an automated assessment of a candidate's eligibility.

## Run locally

Open `index.html` directly in a browser. No installation, backend, API keys or
JSON fetch is required: `data/atlas.js` exposes the initial dataset as a global
JavaScript variable. Online map details require an internet connection; the
included Natural Earth map, records and analytics remain usable offline.

Edits remain in the browser. Export JSON to keep a portable copy. Import only
data you are authorised to use; local edits never automatically publish data.

## Hosting

Upload this directory to any static host, including an FTP subdirectory. For
GitHub Pages choose **Settings → Pages → Deploy from a branch → main → /(root)**.
All application paths are relative. Do not upload the private workspace.

## Structure and checks

`app.js` handles the atlas, `analytics.js` the analysis, `platform-model.js` the
portable data model, and `database-store.js` local persistence. `vendor/` contains
the map libraries and their licence notices. `data/` holds JavaScript payloads.

Run `node scripts/verify-public.cjs` to check dataset references, required source
metadata, public-edition contents and source syntax.

## Sources, rights and limitations

Read [SOURCES.md](SOURCES.md) before redistributing or reusing the data. Source
conditions differ; the educational public edition does not grant blanket rights
over third-party content. No logos, photos or complete vacancy documents are
republished. Source summaries and normalised classifications are editorial
adaptations; original source documents prevail.

The original application code has no general reuse licence assigned in this
release. Third-party libraries retain the licences provided in `vendor/`.
