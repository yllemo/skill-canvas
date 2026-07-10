# Changelog

Alla väsentliga ändringar i Skill Canvas dokumenteras i denna fil.

Formatet bygger på [Keep a Changelog](https://keepachangelog.com/sv/1.1.0/).

## [Unreleased]

### Tillagt

- **Taxonomi-modul** — hierarkiska taxonomier via **⋯ → Taxonomi**
  - Fullskärmseditor `html/taxonomi-editor.php` (Monaco, flera vyer, Mermaid-export, statistik, färger)
  - Sparas som `taxonomi/{id}.md` + PNG-förhandsbild på kortet
  - Valfri höjd på kort (modal + resize-hörn)
  - **Importera fil** synlig även i embed-läge från canvas
- **Mindmap-modul** — tankekarta via **⋯ → Mindmap**
  - Fullskärmseditor `html/mindmap-editor.php` (interaktiv karta, export Markdown/PNG/Mermaid)
  - Sparas som `mindmap/{id}.md` + PNG-förhandsbild
  - Knappen **Ny** för blank karta (även i embed)
  - Standardtitel **Tankekarta**
- **SVG-modul** — vektorgrafik via **⋯ → SVG**
  - Live-rendering av `.svg` på kortet (ingen PNG-förhandsbild)
  - Fullskärmseditor `html/svg-editor.php`
- **OKF `index.md` vid export** — genereras automatiskt i varje `.zip` / `.skill` enligt [Open Knowledge Format](https://github.com/GoogleCloudPlatform/knowledge-catalog/tree/main/okf)
  - YAML-frontmatter (`type: skill`, `title`) och filöversikt med relativa markdown-länkar
  - Generator: `js/okf-index.js`; mall i projektroten `index.md`
- **Varning vid osparade ändringar** — innan stängning/navigering, öppna fil, ny canvas eller dra-och-släpp av arkiv
  - Konfigurerbara texter i `config/defaults.php` under `unsaved`
- **ArchiCode-modul** — ArchiMate 4-diagram med [ArchiCode](https://github.com/yllemo/ArchiCode)-syntax via **⋯ → ArchiCode**
  - Kort på canvas: live-rendering från `.ac`-källkod, automatisk inpassning, ikoner materialiseras som SVG
  - Fullskärmseditor `html/archicode.php` med Monaco och **Spara till kort**
  - Höjd på kort (standard 480 px, resize-hörn)
- **Mermaid-editor — ArchiMate 4-exempel** — dropdown med åtta AM4-diagram (domänöversikt + sju domäner)

### Ändrat

- **⋯-menyn** utökad med Taxonomi, Mindmap och SVG; SVG flyttad från huvudverktygsraden
- **Markdown** — standardhöjd **600 px** på nya kort; vid import av zip utan sparad höjd sätts 600 px automatiskt
- **Mermaid** — standardhöjd **600 px**; höjdfält i modalen; resize i bredd och höjd
- **Taxonomi** — höjd på kort via modal och resize-hörn
- **ArchiCode** — höjd på kort via modal och resize-hörn
- **Zip-export** — `serializeNodeForExport()` filtrerar bort runtime-egenskaper (`_acResizeObs` m.m.) så YAML-export inte kraschar
- **Import** — stöd för `taxonomi/`, `mindmap/`, `svg/` i fallback-import (`js/skill-import.js`)
- **Mermaid AM4** — domän-/elementnamn i `<b>` fetstil; `htmlLabels: true`

### Åtgärdat

- Export av canvas med ArchiCode-noder gav YAML-fel (`ResizeObserver` i noddata) — runtime-fält exkluderas nu vid export
- Markdown-noder blev för höga vid öppning av zip utan sparad `height` — standard 600 px tillämpas vid import

### Dokumentation

- **README.md** — Taxonomi, Mindmap, SVG, OKF `index.md`, höjder, osparade ändringar, uppdaterad zip-struktur
- **CHANGELOG.md** — denna fil

---

## Tidigare (före denna changelog)

Följande fanns redan i kodbasen men var inte fullt dokumenterade i README:

- **PromptBook** — chattkort med prompt (OpenAI, LM Studio, Ollama), fullskärmseditor för inställningar, **⋯ → PromptBook**
- **Relationer (`edges`)** — SVG-kopplingar mellan moduler med ArchiMate 4-stil multiplicitet
- **Inställningar** — canvas-bakgrund (prickar/rutnät/enfärgad) via `config/settings.php`
- **Mermaid-editor** — Monaco, live preview, exempeldiagram, embed från canvas
- **Draw.io / BPMN** — fullskärm med PNG-förhandsbild på kort
