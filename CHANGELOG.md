# Changelog

Alla väsentliga ändringar i Skill Canvas dokumenteras i denna fil.

Formatet bygger på [Keep a Changelog](https://keepachangelog.com/sv/1.1.0/).

## [Unreleased]

### Tillagt

- **ArchiCode-modul** — ArchiMate 4-diagram med [ArchiCode](https://github.com/yllemo/ArchiCode)-syntax via **⋯ → ArchiCode**
  - Kort på canvas: live-rendering från `.ac`-källkod (ArchiCode.js från CDN), automatisk inpassning (fit-to-view) utan klippning
  - Ikoner följer med: `archicode.css` laddas och ikoner materialiseras som inbäddade SVG `<image>` på kortet
  - Fullskärmseditor: `html/archicode.php` — Monaco, live diagram, exempel-dropdown, **Spara till kort** / **Avbryt** (`Ctrl+S` / `Esc`)
  - Källkod sparas som `diagrams/{id}.ac` i zip-exporten
  - Filer: `modules/archicode.php`, `js/modules/archicode.js`, overlay `#ac-editor-overlay` i `index.php`
- **Mermaid-editor — ArchiMate 4-exempel** — ny dropdown **ArchiMate 4** med åtta diagram (domänöversikt + sju domäner), baserade på [archimate.yllemo.com/archimate-mermaid.html](https://archimate.yllemo.com/archimate-mermaid.html)
  - Officiell AM4-färgpalett (`classDef`) och svenska etiketter med `«stereotyp»`
  - Domän-/elementnamn (andra raden) i `<b>` fetstil; `htmlLabels: true` för korrekt HTML-rendering

### Ändrat

- **⋯-menyn:** inaktiv post *ArchiMate* ersatt av aktiv *ArchiCode*
- **add-menu.js:** anropar `ModuleRegistry.openAdd()` direkt vid val i ⋯-menyn; alias `archimate` → `archicode` för bakåtkompatibilitet
- **Import:** `.ac`-filer i zip tolkas som `archicode`-noder (matchande `.svg` som valfri förhandsbild vid import)

### Dokumentation

- **README.md** — ArchiCode, PromptBook, Mermaid AM4 och uppdaterad projektstruktur
- **CHANGELOG.md** — denna fil

---

## Tidigare (före denna changelog)

Följande fanns redan i kodbasen men var inte fullt dokumenterade i README:

- **PromptBook** — chattkort med prompt (OpenAI, LM Studio, Ollama), fullskärmseditor för inställningar, **⋯ → PromptBook**
- **Relationer (`edges`)** — SVG-kopplingar mellan moduler med ArchiMate 4-stil multiplicitet
- **Inställningar** — canvas-bakgrund (prickar/rutnät/enfärgad) via `config/settings.php`
