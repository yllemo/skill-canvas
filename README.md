# Skill Canvas - Från idé till visuell kunskap och återanvändbara skills

![Skill Canvas](skill-canvas.jpg)

## Skill Canvas

En PHP-baserad whiteboard-app för team som vill paketera kompetens till tydliga, visuella skills. Bygg och redigera storyboards med Markdown, Mermaid-diagram, Draw.io-ritningar, bilder (inkl. inbyggd målare), labels, annotations (text+pil) och notes, och exportera allt som en .zip med SKILL.md och YAML frontmatter.

Kompatibel med Claude Skills-formatet — name och description är obligatoriska. name används som canvas-titel i verktygsraden (ingen separat title i metadata).

### AI-skills som fungerar direkt

Skill Canvas paketerar allt i en .zip-fil med SKILL.md i centrum, så samma innehåll kan användas direkt av agentisk AI utan efterbehandling. Samtidigt får team en snygg visuell whiteboard-upplevelse för att bygga, granska och vidareutveckla samma skill tillsammans.

Resultatet är ett gemensamt arbetsformat där människor och AI samarbetar i samma moduluppbyggda struktur: visuellt på canvasen och maskinläsbart i SKILL.md-paketeringen.

### Från whiteboard till delbar AI-skill

Du kan klistra in en bild direkt i Skill Canvas, rita eller redigera den i målaren, och allt följer automatiskt med i .zip-filen vid export. Markdown-kort visar inbäddade bilder från zip vid import. Det gör att samma material kan öppnas av en kollega, delas vidare i teamet eller användas direkt av AI och agentiska AI-skills.

All paketering styrs via SKILL.md-standarden från Anthropic (Claude AI Skills), vilket ger ett tydligt och portabelt format för både människor och AI.

Du får en inbyggd markdown-editor (Monaco), DOCX-import till Markdown med bilder, Mermaid-stöd, Draw.io-integration och en enkel paint-editor för bildnoder.

### Därför Skill Canvas

- Paketera kunskap till delbara skills som är lätta att återanvända i team och AI-flöden
- Samla text, diagram, ritningar och visuella artefakter på en gemensam canvas för snabbare alignment
- Skapa en tydlig bro mellan idé, struktur och leverans i ett format som går att versionera

### Open source och bidrag

Skill Canvas är ett open source-projekt och vi välkomnar bidrag från både utvecklare, designers och AI-praktiker.

Se CONTRIBUTING.md för riktlinjer kring issues, pull requests och rekommenderat arbetssätt.

---

## Kom igång

1. Kör appen via PHP (t.ex. `php -S localhost:8080` i projektroten) och öppna `index.php`
2. **Öppna** en befintlig `.zip`, dra den till fönstret, eller välj **Ny tom canvas** via öppna-menyn
3. Fyll i skill-metadata (`name`, `description`, …) vid ny canvas — standardvärden fylls i automatiskt
4. Lägg till noder via toolbaren längst ner
5. **Exportera** som `.zip` (eller `Ctrl+S`) — eller som `.png` för en bild av canvasen

Körs som en PHP-webbapp och gör det enkelt att ta en idé till en delbar, visuellt förankrad skill.

> **Legacy:** `html/skill-canvas.html` är en äldre monolitisk version. Den aktiva appen är `index.php` med modulär PHP/JS-struktur. Fristående verktyg (`html/drawio-skill-editor.html`, `html/paint-skill-editor.html`) omdirigerar till respektive `.php`-embed.

---

## Verktygsrad

| Element | Funktion |
|---------|----------|
| **Titel** (`name`) | Klicka för att öppna skill-metadata. Beskrivningen (`description`) visas som underrad. |
| **Öppna** ▾ | Klick = filväljare. Pil = meny: *Öppna .zip-fil* / *Ny tom canvas* |
| **Exportera** ▾ | *Spara .zip* (SKILL.md + filer) eller *Spara .png* (bild av alla objekt) |
| **Canvas** | Öppna skill-metadata |
| **Centrera** | Zooma ut så att alla noder syns |
| **Tema** | Växla ljust/mörkt läge |

Exportfiler namnges automatiskt:

```
my-skill_2026-05-31_14.30.45.zip
my-skill_2026-05-31_14.30.45.png
```

---

## Navigera på canvas

| Åtgärd | Hur |
|--------|-----|
| Panorera | `Mellanslag + dra` eller mittenmusknapp |
| Zooma | Scrollhjul |
| Centrera allt | **Centrera** |
| Fokusera en nod | Dubbelklick på handtaget, eller fokus-ikonen (ej Notes) |
| Markera nod | Klick |
| Flytta nod | Dra i handtaget (Markdown, Mermaid, Bild, Draw.io, Annotation) — eller direkt på ytan (Label, Note) |
| Ändra storlek | Resize-hörn nere till höger (Note och Annotation: bredd och höjd) |
| Kontextmeny | Högerklick på nod |
| Ta bort markerad | `Delete` / `Backspace` |
| Duplicera markerad | `Ctrl+D` |
| Spara .zip | `Ctrl+S` |

Handtaget på Markdown, Mermaid, Bild och Draw.io ligger i dokumentflödet (trycker inte ner innehållet ovanpå text/diagram vid hover).

---

## Nodtyper

### Markdown
Full Markdown-support: rubriker, listor, tabeller, kodblock, citat, länkar. Innehåll sparas som `.md` under `nodes/`. Bilder i Markdown (relativa sökvägar i zip) visas på kortet efter import.

- **Fullskärmseditor** — grön knapp nere till vänster i redigeringsmodalen öppnar Monaco-editor (`html/markdown.php`) i iframe med `postMessage`-sparande.
- **Importera DOCX** — grön knapp bredvid fullskärmseditorn öppnar `html/docx-to-skill.php` och kan skicka konverterad Markdown (med bilder i zip-minnet) tillbaka till editorn eller modalen.

### Mermaid
Diagram med [Mermaid](https://mermaid.js.org/)-syntax. Kod sparas som `.mmd` under `diagrams/`.

- **Mermaid Live** — grön knapp i redigeringsmodalen öppnar [mermaid.live](https://mermaid.live/) i ny flik.

### Draw.io
Ritningar via inbäddad [diagrams.net](https://embed.diagrams.net/) i fullskärm. XML sparas som `.drawio` under `diagrams/`; kortet visar en PNG-förhandsvisning.

- Lägg till via **Draw.io** i nedre verktygsraden
- **Redigera** öppnar editorn direkt och laddar sparad XML
- **Spara till kort** i editorn uppdaterar både XML och förhandsbild i zip-exporten
- Kräver internet (embed från diagrams.net)

### Bild
Uppladdning, extern URL eller **Ctrl+V** (klistra in från urklipp). Lokala bilder sparas under `images/` med tidsstämpel i filnamnet (`YYYY-MM-DD_HH.mm.ss.png`). Caption och alt-text stöds.

- **Måla / redigera bild** — grön knapp nere till vänster i modalen öppnar paint-editorn (`html/paint-skill-editor.php`): penna, pensel, former, fyll, text, suddgummi, pipett, ångra/gör om. Tom canvas vid ny bild, befintlig bild laddas vid redigering. **Spara till kort** exporterar PNG tillbaka till noden.

### Label
Fri text direkt på canvas — ingen kortyta. Teckenstorlek och färg väljs i modal. Dra genom att greppa texten.

### Annotation
Text med pil (SVG) för att förklara eller peka ut delar av canvasen. Modal med live-förhandsvisning — klicka för att placera pilspetsen. Välj riktning (↗↖↘↙), pilform (böjd, rak, swoosh, skiss), färg, typsnitt (Caveat/Kalam m.fl.), textstorlek och pilens längd. Transparent på canvas; justera yta med resize-hörnet. Handtaget döljs tills hover/markering.

### Note
Post-it-liknande kort med inline-redigering (`contenteditable`). Ingen redigeringsmodal — skriv direkt på kortet.

- Sex färger (välj vid skapande eller via färgknappar i nedre verktygsraden vid hover)
- Flytta via nedre verktygsraden (grab-cursor)
- Ändra bredd och höjd via resize-hörn
- Ingen fokus-zoom (övriga nodtyper har det)

---

## Fullskärmseditorer (iframe)

Tre moduler använder overlay med iframe och `postMessage`-protokoll:

| Modul | URL | Meddelanden (urval) |
|-------|-----|---------------------|
| Markdown | `html/markdown.php` | `sc-markdown-ready`, `sc-markdown-init`, `sc-markdown-save` |
| Draw.io | `html/drawio-skill-editor.php` | `sc-drawio-ready`, `sc-drawio-init`, `sc-drawio-save` |
| Bild (målare) | `html/paint-skill-editor.php` | `sc-paint-ready`, `sc-paint-init`, `sc-paint-save` |

DOCX-import använder `html/docx-to-skill.php` och `js/docx-import.js` med samma overlay-mönster.

---

## Projektstruktur

```
skill-canvas/
├── index.php              ← huvudapp
├── app.js                 ← canvas, zoom, export, noder, markdown-bilder
├── style.css
├── favicon.svg
├── config/
│   ├── app.php            ← apptitel, språk, tema, favicon
│   └── defaults.php       ← standardvärden för skill, canvas, nodtyper, moduler
├── includes/              ← bootstrap, modul-laddare, hjälpfunktioner
├── modules/               ← PHP: modal-HTML per nodtyp
│   ├── markdown.php
│   ├── mermaid.php
│   ├── bild.php
│   ├── drawio.php
│   ├── label.php
│   ├── annotation.php
│   └── notes.php
├── js/
│   ├── modal.js
│   ├── docx-import.js
│   └── modules/           ← JS: add/edit/render per nodtyp
├── api/modal.php          ← returnerar modal-HTML som JSON
└── html/
    ├── markdown.php       ← Monaco fullskärm
    ├── drawio-skill-editor.php
    ├── paint-skill-editor.php
    ├── docx-to-skill.php
    ├── js/
    │   ├── drawio-embed.js
    │   ├── paint-editor.js
    │   ├── paint-embed.js
    │   └── docx-converter.js
    └── css/
        └── paint-editor.css
```

Nya nodtyper läggs till som par av `modules/<slug>.php` + `js/modules/<slug>.js`, registrerade automatiskt via `ModuleRegistry` och `includes/module-loader.php`.

---

## SKILL.md-format

Varje `.zip` måste innehålla `SKILL.md` med YAML frontmatter. Övriga filer i zip:en refereras via `file`- (och vid Draw.io även `previewFile`-) fält i noderna.

### Metadata

```yaml
---
name: my-skill
description: Describe when an AI agent should activate this skill. Agentic systems compare the user's request to this text to decide if the skill is relevant—list concrete situations, topics, or example questions (e.g. "Use when the user asks about our onboarding process or needs a visual overview of X"). The canvas holds the knowledge; description is the trigger.
author: ''
version: '1.0'
tags:
  - klos
  - bas

nodes:
  # ... se nodschema nedan
---
```

| Fält | Typ | Beskrivning |
|------|-----|-------------|
| `name` | sträng | **Obligatorisk.** Skill-id, canvas-titel och bas för exportfilnamn |
| `description` | sträng | **Obligatorisk.** När/hur skillen ska användas |
| `author` | sträng | Valfri |
| `version` | sträng | Valfri, standard `1.0` |
| `tags` | lista | Valfria sökbara taggar |

Vid import av äldre zip-filer med `title` (utan `name`) används `title` som `name`.

### Gemensamt nodschema

| Fält | Typ | Beskrivning |
|------|-----|-------------|
| `id` | sträng | Unikt ID, genereras automatiskt |
| `type` | sträng | `markdown` \| `mermaid` \| `drawio` \| `image` \| `label` \| `annotation` \| `note` |
| `x`, `y` | heltal | Position i px |
| `width` | heltal | Bredd i px |
| `height` | heltal | Höjd i px (Note, Annotation) |
| `title` | sträng | Valfri rubrik i nodhandtaget (Markdown, Mermaid, Bild, Draw.io) |

### Markdown

```yaml
- id: n001
  type: markdown
  x: 80
  y: 200
  width: 420
  title: "Visas i handtaget"
  file: nodes/n001.md
```

### Mermaid

```yaml
- id: n002
  type: mermaid
  x: 540
  y: 200
  width: 500
  title: "Systemlandskap"
  file: diagrams/n002.mmd
```

### Draw.io

```yaml
- id: n007
  type: drawio
  x: 100
  y: 180
  width: 480
  title: "Processflöde"
  file: diagrams/n007.drawio
  previewFile: diagrams/n007.png
```

### Bild

```yaml
- id: n003
  type: image
  x: 80
  y: 600
  width: 400
  file: images/2026-05-31_14.30.45.png
  caption: "Bildtext"
  alt: "Beskrivning"
```

### Label

```yaml
- id: n004
  type: label
  x: 80
  y: 60
  content: "GT Domänarkitektur"
  fontSize: 38
  color: "#0077bc"
```

### Annotation

```yaml
- id: n005
  type: annotation
  x: 120
  y: 300
  width: 320
  height: 160
  content: "Snabba idéer"
  tipX: 280
  tipY: 130
  dir: ne
  arrowStyle: curve
  arrowLen: 90
  rotation: 0
  color: "#F5A623"
  fontSize: 26
  strokeWidth: 2.5
  fontFamily: "'Caveat', cursive"
```

### Note

```yaml
- id: n006
  type: note
  x: 200
  y: 400
  width: 220
  height: 160
  color: "#fff9a8"
  content: "Skriv här…"
```

---

## Zip-struktur

```
my-skill.zip
├── SKILL.md
├── nodes/
│   └── n001.md
├── diagrams/
│   ├── n002.mmd
│   ├── n007.drawio
│   └── n007.png
└── images/
    └── 2026-05-31_14.30.45.png
```

Mappnamn följer konventioner i `config/defaults.php` men styrs i praktiken av `file`-sökvägar i noderna.

---

## Konfiguration

Standardvärden i `config/defaults.php` kan justeras utan kodändring:

- **skill** — standard `name`, `description`, `author`, `version`, `tags` för ny canvas
- **canvas** — zoom-gränser, marginaler vid centrering/fokus
- **nodes.\*** — standardbredd, min/max per nodtyp
- **modules.\*** — modaltexter, placeholders, editor-URL:er, note-färger, DOCX-/paint-/drawio-etiketter

Apptitel, språk och favicon: `config/app.php`.

`index.php` sätter `SC_APP.basePath` utifrån webbplatsens sökväg så att editor-iframe:ar fungerar även om appen ligger i en undermapp.

---

## Design

Ljust och mörkt tema. Favicon: `favicon.svg` (konfigurerbar i `config/app.php`).

CDN-bibliotek: Mermaid, marked, JSZip, js-yaml, html2canvas (PNG-export), Monaco Editor (markdown fullskärm).

Externa tjänster vid redigering: diagrams.net (Draw.io embed), ingen extern tjänst för paint-editorn.

---

## Kompatibilitet

Testad i Chrome 120+, Edge 120+, Firefox 121+.

- **PHP-app:** kräver webbserver (PHP inbyggd server räcker)
- **All data lokalt** — zip/png laddas ner till disk; Draw.io embed använder internet mot diagrams.net
- PNG-export renderar en klon av noderna off-screen via html2canvas (2× upplösning)
