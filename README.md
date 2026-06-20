# Skill Canvas - Från idé till visuell kunskap och återanvändbara skills

![Skill Canvas](skill-canvas.jpg)

## Skill Canvas

En PHP-baserad whiteboard-app för team som vill paketera kompetens till tydliga, visuella skills. Bygg och redigera storyboards med Markdown, Mermaid-diagram, **ArchiMate 4 (ArchiCode)**, Draw.io-ritningar, **BPMN-processdiagram**, bilder (inkl. inbyggd målare), labels, annotations (text+pil), notes, **HTML/iframe**, **PromptBook** (chattkort med LLM) och **relationer mellan moduler**, och exportera allt som en .zip med SKILL.md och YAML frontmatter.

> Se [CHANGELOG.md](CHANGELOG.md) för senaste ändringar.

Kompatibel med Claude Skills-formatet — name och description är obligatoriska. name används som canvas-titel i verktygsraden (ingen separat title i metadata).

### AI-skills som fungerar direkt

Skill Canvas paketerar allt i en .zip-fil med SKILL.md i centrum, så samma innehåll kan användas direkt av agentisk AI utan efterbehandling. Samtidigt får team en snygg visuell whiteboard-upplevelse för att bygga, granska och vidareutveckla samma skill tillsammans.

Resultatet är ett gemensamt arbetsformat där människor och AI samarbetar i samma moduluppbyggda struktur: visuellt på canvasen och maskinläsbart i SKILL.md-paketeringen.

### Från whiteboard till delbar AI-skill

Du kan klistra in en bild direkt i Skill Canvas, rita eller redigera den i målaren, och allt följer automatiskt med i .zip-filen vid export. Markdown-kort visar inbäddade bilder från zip vid import. Det gör att samma material kan öppnas av en kollega, delas vidare i teamet eller användas direkt av AI och agentiska AI-skills.

All paketering styrs via SKILL.md-standarden från Anthropic (Claude AI Skills), vilket ger ett tydligt och portabelt format för både människor och AI.

Du får en inbyggd markdown-editor (Monaco), DOCX-import till Markdown med bilder, Mermaid-stöd, Draw.io-integration, BPMN-editor (bpmn-js) och en enkel paint-editor för bildnoder.

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
2. **Öppna** en befintlig `.zip` eller `.skill`-fil (samma format), dra den till fönstret, eller välj **Ny tom canvas** via öppna-menyn
3. Fyll i skill-metadata (`name`, `description`, …) vid ny canvas — standardvärden fylls i automatiskt (standardnamn t.ex. `my-skill-2026-05-31` med dagens datum)
4. Lägg till noder via toolbaren längst ner. **⋯** (längst till höger) innehåller **HTML / iframe**, **BPMN**, **PromptBook** och **ArchiCode**. **Draw.io** och **Mermaid** har egna knappar. Koppla moduler med **länk-ikonen** i handtaget.
5. **Exportera** som `.zip` (eller `Ctrl+S`) — eller som `.png` för en bild av canvasen

Körs som en PHP-webbapp och gör det enkelt att ta en idé till en delbar, visuellt förankrad skill.

> **Legacy:** `html/skill-canvas.html` är en äldre monolitisk version. Den aktiva appen är `index.php` med modulär PHP/JS-struktur. Fristående verktyg (`html/drawio-skill-editor.html`, `html/bpmn-skill-editor.html`, `html/paint-skill-editor.html`) kan användas utan canvas; embed från canvas går via respektive `.php`-editor.

---

## Verktygsrad

| Element | Funktion |
|---------|----------|
| **Titel** (`name`) | Klicka för att öppna skill-metadata. Beskrivningen (`description`) visas som underrad. |
| **Öppna** ▾ | Klick = filväljare (.zip / .skill). Pil = meny: *Öppna .zip / .skill* / *Ny tom canvas* |
| **Exportera** ▾ | *Spara .zip* (SKILL.md + filer) eller *Spara .png* (bild av alla objekt) |
| **Canvas** | Öppna skill-metadata (inkl. **Skill-träd** — filöversikt i paketet) |
| **Centrera** | Zooma ut så att alla noder syns |
| **Tema** | Växla ljust/mörkt läge |

Exportfiler namnges automatiskt (skill-namn + tidsstämpel):

```
my-skill-2026-05-31_2026-05-31_14.30.45.zip
my-skill-2026-05-31_2026-05-31_14.30.45.png
```

Ny canvas får som standard `name` med datum-suffix (`my-skill-YYYY-MM-DD`). Styr basnamn och suffix i `config/defaults.php` (`nameBase`, `nameDateSuffix`).

---

## Navigera på canvas

| Åtgärd | Hur |
|--------|-----|
| Panorera | `Mellanslag + dra` eller mittenmusknapp |
| Zooma | Scrollhjul |
| Centrera allt | **Centrera** |
| Fokusera en nod | Dubbelklick på handtaget, eller fokus-ikonen (ej Notes) |
| Markera nod | Klick |
| Flytta nod | Dra i handtaget (Markdown, Mermaid, ArchiCode, Bild, Draw.io, BPMN, HTML, PromptBook, Annotation) — eller direkt på ytan (Label, Note) |
| Ändra storlek | Resize-hörn nere till höger (Note, Annotation, HTML: bredd och höjd; övriga: bredd) |
| Kontextmeny | Högerklick på nod — inkl. **Spara som .png** (enskilt kort) och **Flytta längst fram** (z-ordning på canvas och exportordning) |
| Ta bort markerad | `Delete` / `Backspace` |
| Duplicera markerad | `Ctrl+D` |
| Spara .zip | `Ctrl+S` |

Handtaget på Markdown, Mermaid, ArchiCode, Bild, Draw.io, BPMN, HTML och PromptBook ligger ovanför kortet (trycker inte ner innehållet vid hover). En osynlig hover-brygga gör det lättare att nå handtaget utan att träffa noden.

På **Markdown-kort** med fast höjd scrollar mushjulet innehållet i kortet i stället för att zooma canvas.

---

## Nodtyper

### Markdown
Full Markdown-support: rubriker, listor, tabeller, kodblock, citat, länkar. Innehåll sparas som `.md` under `nodes/`. Bilder i Markdown (relativa sökvägar i zip) visas på kortet efter import. Standardbredd på nya kort: **720 px** (läsbredd). Valfri **fast höjd** (px) ger scroll i kortet vid längre innehåll.

- **Fullskärmseditor** — grön knapp nere till vänster i redigeringsmodalen öppnar Monaco-editor (`html/markdown.php`) i iframe med `postMessage`-sparande.
- **Importera DOCX** — finns i fullskärmseditorn (`html/docx-to-skill.php`); konverterad Markdown (med bilder i zip-minnet) kan skickas tillbaka till editorn.

### Mermaid
Diagram med [Mermaid](https://mermaid.js.org/)-syntax. Kod sparas som `.mmd` under `diagrams/`.

- **Mermaid-editor** — knapp nere till vänster i redigeringsmodalen öppnar inbyggd fullskärmseditor (`html/mermaid-editor.php`): Monaco med Mermaid-syntax, live-förhandsvisning, exempeldiagram (flöde, sekvens, Gantt, C4 m.m.), **ArchiMate 4 (C260)**-exempel i egen dropdown (domänöversikt + sju domäner, [referens](https://archimate.yllemo.com/archimate-mermaid.html)), zoom/pan, kopiera kod, PNG/SVG-export. Tema följer Skill Canvas (ljust/mörkt).
- Headern länkar till [mermaid.js.org](https://mermaid.js.org/) och [mermaid.live](https://mermaid.live/) (även i embed-läge från canvas).

### ArchiCode
ArchiMate 4-diagram med [ArchiCode](https://github.com/yllemo/ArchiCode)-syntax. Källkod sparas som `.ac` under `diagrams/`.

- Lägg till via **⋯ → ArchiCode**
- **Kortet** renderar diagrammet live från källkoden (samma motor som editorn), inpassat så att hela diagrammet syns utan klippning; ikoner följer med
- **ArchiCode-editor** — knapp nere till vänster i redigeringsmodalen, eller öppnas direkt efter skapande: fullskärm (`html/archicode.php`) med Monaco, live diagram, exempel-dropdown och **Spara till kort**
- Bibliotek (`archicode.js` / `archicode.css`) laddas från CDN vid behov

### Draw.io
Ritningar via inbäddad [diagrams.net](https://embed.diagrams.net/) i fullskärm. XML sparas som `.drawio` under `diagrams/`; kortet visar en PNG-förhandsvisning.

- Lägg till via **Draw.io** i nedre verktygsraden
- **Redigera** öppnar editorn direkt och laddar sparad XML
- **Spara till kort** i editorn uppdaterar både XML och förhandsbild i zip-exporten
- Kräver internet (embed från diagrams.net)
- Headern visar *Powered by [diagrams.net](https://www.diagrams.net/)*

### BPMN
Processdiagram med [bpmn-js](https://bpmn.io/) i fullskärm. XML sparas som `.bpmn` under `diagrams/`; kortet visar en PNG-förhandsvisning — samma mönster som Draw.io.

- Lägg till via **⋯ → BPMN**
- **Redigera** öppnar BPMN-editorn (`html/bpmn-skill-editor.php`) och laddar sparad XML
- **Spara till kort** exporterar `.bpmn` + PNG till zip och uppdaterar kortet
- Fristående ZIP/SKILL.md-verktyg: `html/bpmn-skill-editor.html`
- Headern visar *Powered by [bpmn.io](https://bpmn.io/)*

### Bild
Uppladdning, extern URL eller **Ctrl+V** (klistra in från urklipp). Lokala bilder sparas under `images/` med tidsstämpel i filnamnet (`YYYY-MM-DD_HH.mm.ss.png`). Caption och alt-text stöds.

- **Måla / redigera bild** — grön knapp nere till vänster i modalen öppnar paint-editorn (`html/paint-skill-editor.php`): penna, pensel, former, fyll, text, suddgummi, pipett, ångra/gör om. Tom canvas vid ny bild, befintlig bild laddas vid redigering. **Spara till kort** exporterar PNG tillbaka till noden.

### Label
Fri text direkt på canvas — ingen kortyta. Teckenstorlek och färg väljs i modal. Handtaget (LBL + Redigera/Fokusera/Ta bort) visas **ovanför** texten vid hover/markering — som Markdown och Bild — så länkar i texten inte täcks.

- **Markdown-länkar** — `[Hej](https://…)` visas på canvas som **Hej**; full syntax `[Hej](https://…)` redigeras i modalen
- **URL i text** — `https://…` blir klickbar länk (visas som hela URL:en)
- Länkar ser ut som övrig text (samma färg och storlek) och öppnas i **ny flik**

### Annotation
Text med pil (SVG) för att förklara eller peka ut delar av canvasen. Modal med live-förhandsvisning — klicka för att placera pilspetsen. Välj riktning (↗↖↘↙), pilform (böjd, rak, swoosh, skiss), färg, typsnitt (Caveat/Kalam m.fl.), textstorlek och pilens längd. Transparent på canvas; justera yta med resize-hörnet. Handtaget döljs tills hover/markering.

### Note
Post-it-liknande kort med inline-redigering (`contenteditable`). Ingen redigeringsmodal — skriv direkt på kortet.

- Sex färger (välj vid skapande eller via färgknappar i nedre verktygsraden vid hover)
- Flytta via nedre verktygsraden (grab-cursor)
- Ändra bredd och höjd via resize-hörn
- Ingen fokus-zoom (övriga nodtyper har det)

### HTML / iframe
Bädda in webbinnehåll på canvas via iframe — samma kortlayout oavsett källa. Lägg till via **⋯ → HTML / iframe**.

Modalen har två flikar:

| Flik | Innehåll |
|------|----------|
| **iFrame** | Extern **Website URL** (standard `https://blog.yllemo.com`) |
| **HTML** | Egen **HTML-kod** som sparas som `.html` i paketet; du väljer **filnamn** (t.ex. `min-sida` → `html/min-sida.html`) |

Gemensamt för båda: höjd och kortbredd på canvas, samt live **iframe-kod** (hopfällbar) med knapp **Kopiera iframe-kod**.

- På canvas visas alltid en **iframe** (extern URL eller blob från intern fil)
- Länk under förhandsvisningen öppnar sidan/filen i ny flik
- Iframe är interaktiv när noden är **markerad** (annars blockeras klick så noden går att dra)
- Vissa externa sidor blockar inbäddning (`X-Frame-Options`) — använd då länken eller HTML-fliken med egen fil

```yaml
# Extern URL
- id: n008
  type: html
  source: url
  url: https://blog.yllemo.com
  width: 640
  height: 400
  iframeWidth: 100%

# Intern HTML-fil i zip
- id: n009
  type: html
  source: file
  file: html/min-sida.html
  width: 640
  height: 400
  iframeWidth: 100%
```

### PromptBook
Chattkort med en konfigurerbar prompt — anslut till OpenAI, LM Studio eller Ollama. LLM-inställningar sparas i webbläsarens `localStorage` (exporteras inte i zip); nodens prompt och chatt sparas i `promptbook/{id}.json`.

- Lägg till via **⋯ → PromptBook**
- **Kortet** visar chattgränssnittet (iframe); LLM visas i nodhandtaget
- **Redigera** öppnar fullskärmseditor (`html/promptbook.php`) för systemprompt, variabler och inställningar
- Lokala LLM-tjänster (Ollama m.m.) kan kräva proxy eller LAN-URL — se `api/llm-proxy.php`

---

## Mobila enheter

Gränssnittet är anpassat för telefon och surfplatta utan att ändra canvas-modellen:

- **Panorera** — dra med ett finger på tom yta i canvas
- **Zoom** — nyp med två fingrar, eller zoom-knapparna nere till höger
- **Flytta nod** — dra via handtaget (label: dra direkt på texten)
- **Storlek** — dra resize-hörnet (större på pekskärm)
- **Snabbmeny** — håll nedtryckt (~0,5 s) på en nod
- **Header och lägg-till-panel** — horisontell scroll; ikoner utan text på smala skärmar
- **Modaler** — fullskärm på mobil; metadata-fält i en kolumn

Fullskärmseditorer (Markdown, Mermaid, ArchiCode, Draw.io, BPMN, PromptBook, målare) har redan `viewport` och egna responsiva verktygsrader. Diagram-editorerna visar diskret **credit** med länk till respektive open source-projekt i headern.

### Inställningar

Knappen **Inställningar** (bredvid Tema) öppnar en panel med app-preferenser. Val sparas i `localStorage` (samma webbläsare).

- **Canvas-bakgrund** — prickar (standard), rutnät eller enfärgad. Använder `--canvas-bg` och `--grid` så ljust/mörkt tema fungerar automatiskt.
- **Bakgrundsfärg** och **färg prickar/linjer** — egna färger via färgväljare, eller **Återställ** för temastandard. Rutnätsfärgen döljs vid enfärgad bakgrund.

Nya inställningar läggs i `config/settings.php` (schema och standardvärden). Rendering sker via `includes/settings.php`; beteende i `js/settings.js`. Vid ändring skickas `sc-settings-change` (som `sc-theme-change`).

### Skill-metadata och Skill-träd

Knappen **Canvas** (eller titeln i headern) öppnar skill-metadata: `name`, `description`, `author`, `version`, `tags`.

Längst ner till vänster i samma modal: **Skill-träd** — visar alla filer i paketet (samma innehåll som exporteras till zip), storlek, och vilka som är kopplade till noder. `SKILL.md` markeras som genererad vid export om den saknas i minnet.

---

## Fullskärmseditorer (iframe)

Flera moduler använder overlay med iframe och `postMessage`-protokoll:

| Modul | URL | Meddelanden (urval) |
|-------|-----|---------------------|
| Markdown | `html/markdown.php` | `sc-markdown-ready`, `sc-markdown-init`, `sc-markdown-save` |
| Mermaid | `html/mermaid-editor.php` | `sc-mermaid-ready`, `sc-mermaid-init`, `sc-mermaid-save` |
| ArchiCode | `html/archicode.php` | `sc-archicode-ready`, `sc-archicode-init`, `sc-archicode-save` |
| Draw.io | `html/drawio-skill-editor.php` | `sc-drawio-ready`, `sc-drawio-init`, `sc-drawio-save` |
| BPMN | `html/bpmn-skill-editor.php` | `sc-bpmn-ready`, `sc-bpmn-init`, `sc-bpmn-save` |
| Bild (målare) | `html/paint-skill-editor.php` | `sc-paint-ready`, `sc-paint-init`, `sc-paint-save` |
| PromptBook | `html/promptbook.php` | `sc-promptbook-ready`, `sc-promptbook-init`, `sc-promptbook-save` |

DOCX-import använder `html/docx-to-skill.php` och `js/docx-import.js` med samma overlay-mönster.

### Credits i editor-header

Fullskärmseditorer för Mermaid, Draw.io och BPMN visar en diskret pill-länk högst upp till respektive officiella projekt (gemensam stil i `html/css/editor-credit.css`):

| Editor | Länk |
|--------|------|
| Mermaid | [mermaid.js.org](https://mermaid.js.org/), [mermaid.live](https://mermaid.live/) |
| Draw.io | [diagrams.net](https://www.diagrams.net/) |
| BPMN | [bpmn.io](https://bpmn.io/) |

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
│   ├── defaults.php       ← standardvärden för skill, canvas, nodtyper, moduler
│   ├── settings.php       ← app-inställningar (schema, standardvärden)
│   └── add-menu.php       ← ⋯-menyn: HTML, BPMN, PromptBook, ArchiCode
├── includes/              ← bootstrap, modul-laddare, settings/add-menu, head-meta, hjälpfunktioner
├── modules/               ← PHP: modal-HTML per nodtyp
│   ├── markdown.php
│   ├── mermaid.php
│   ├── archicode.php
│   ├── promptbook.php
│   ├── bild.php
│   ├── drawio.php
│   ├── bpmn.php
│   ├── label.php
│   ├── annotation.php
│   ├── notes.php
│   └── html.php
├── js/
│   ├── modal.js
│   ├── add-menu.js        ← ⋯-meny i lägg-till-panelen
│   ├── skill-import.js    ← zip/.skill-validering + fallback-import
│   ├── skill-tree.js      ← filträd i skill-metadata-modalen
│   ├── connections.js     ← relationer mellan moduler (SVG)
│   ├── docx-import.js
│   └── modules/           ← JS: add/edit/render per nodtyp
├── api/
│   ├── modal.php          ← returnerar modal-HTML som JSON
│   └── llm-proxy.php      ← proxy för lokala LLM (PromptBook)
└── html/
    ├── markdown.php       ← Monaco fullskärm
    ├── mermaid-editor.php ← Mermaid Monaco + live preview + AM4-exempel
    ├── archicode.php      ← ArchiCode Monaco + live diagram
    ├── promptbook.php     ← PromptBook chatt + inställningar
    ├── drawio-skill-editor.php
    ├── bpmn-skill-editor.php
    ├── bpmn-skill-editor.html ← fristående BPMN → SKILL.md / ZIP
    ├── paint-skill-editor.php
    ├── docx-to-skill.php
    ├── archicode.html     ← fristående ArchiCode-demo (legacy)
    ├── js/
    │   ├── drawio-embed.js
    │   ├── bpmn-embed.js
    │   ├── paint-editor.js
    │   ├── paint-embed.js
    │   └── docx-converter.js
    └── css/
        ├── editor-credit.css
        └── paint-editor.css
```

Nya nodtyper läggs till som par av `modules/<slug>.php` + `js/modules/<slug>.js`, registrerade automatiskt via `ModuleRegistry` och `includes/module-loader.php`.

---

## SKILL.md-format

Varje `.zip` eller `.skill` (samma format) bör innehålla `SKILL.md` med YAML frontmatter och en `nodes`-array för full Skill Canvas-layout. Övriga filer refereras via `file`- (och vid Draw.io/BPMN även `previewFile`-) fält i noderna.

**Import:** Om frontmatter saknas eller inte har `nodes` importeras filen ändå — `SKILL.md` och övriga `.md` blir markdown-noder, `.mmd` mermaid, `.ac` archicode, `.drawio` draw.io, `.bpmn` BPMN (med matchande `.png` som förhandsbild om den finns), `.html` html-noder (intern fil), `.json` under `promptbook/` promptbook-noder, bilder blir bild-noder. Metadata från giltig YAML (namn, beskrivning m.m.) används när den går att läsa.

### Metadata

```yaml
---
name: my-skill-2026-05-31
description: Describe when an AI agent should activate this skill. Agentic systems compare the user's request to this text to decide if the skill is relevant—list concrete situations, topics, or example questions (e.g. "Use when the user asks about our onboarding process or needs a visual overview of X"). The canvas holds the knowledge; description is the trigger.
author: ''
version: '1.0'
tags:
  - klos
  - bas

nodes:
  # ... se nodschema nedan

edges:
  # valfritt — relationer mellan moduler (ej Notes)
  - id: e001
    from: n001
    to: n002
    label: "läser"
    style: curve
    strokeWidth: 2
    color: "#0077bc"
    markerEnd: arrow
    multiplicityStart: "1"
    multiplicityEnd: "0..*"
---
```

| Fält | Typ | Beskrivning |
|------|-----|-------------|
| `name` | sträng | **Obligatorisk.** Skill-id, canvas-titel och bas för exportfilnamn |
| `description` | sträng | **Obligatorisk.** När/hur skillen ska användas |
| `author` | sträng | Valfri |
| `version` | sträng | Valfri, standard `1.0` |
| `tags` | lista | Valfria sökbara taggar |
| `edges` | lista | Valfria kopplingar mellan moduler (se nedan) |

### Relationer (`edges`)

Kopplingar ritas som SVG-linjer bakom noderna. Skapa via **länk-ikonen** i modulens handtag (dra till en annan modul). Notes kan varken kopplas från eller till. Klicka på en linje för att redigera text, utseende (böjd/rak/streckad), tjocklek, färg och **ändpunkter** (pil, diamant, cirkel eller ingen).

| Fält | Typ | Beskrivning |
|------|-----|-------------|
| `id` | sträng | Unikt ID |
| `from`, `to` | sträng | Käll- och mål-nod (`id`) |
| `label` | sträng | Valfri text på linjen |
| `style` | sträng | `curve` (standard), `straight`, `dashed` |
| `strokeWidth` | heltal | Linjebredd i px, standard `2` |
| `color` | sträng | Hex-färg, standard `#0077bc` |
| `markerStart` | sträng | `none` (standard), `arrow`, `diamond`, `circle` — vid källmodulen |
| `markerEnd` | sträng | `arrow` (standard), `none`, `diamond`, `circle` — vid målmodulen |
| `multiplicityStart` | sträng | Valfri kardinalitet vid källan, t.ex. `1`, `0..1` |
| `multiplicityEnd` | sträng | Valfri kardinalitet vid målet, t.ex. `1..*`, `0..*` |

Äldre filer med `arrowEnd: false` tolkas som `markerEnd: none`. Multiplicitet visas vid linjens ändpunkter (ArchiMate 4-stil). Förifyllda förslag i dialogen: `1`, `0..1`, `1..1`, `1..*`, `0..*`, `*`, `n`, `n..m` — fri text stöds också.

Standardvärden i `config/defaults.php` under `edges`.

Vid import av äldre zip-filer med `title` (utan `name`) används `title` som `name`.

### Gemensamt nodschema

| Fält | Typ | Beskrivning |
|------|-----|-------------|
| `id` | sträng | Unikt ID, genereras automatiskt |
| `type` | sträng | `markdown` \| `mermaid` \| `archicode` \| `drawio` \| `bpmn` \| `image` \| `label` \| `annotation` \| `note` \| `html` \| `promptbook` |
| `x`, `y` | heltal | Position i px |
| `width` | heltal | Bredd i px |
| `height` | heltal | Höjd i px (Note, Annotation, HTML; Markdown vid fast höjd) |
| `title` | sträng | Valfri rubrik i nodhandtaget (Markdown, Mermaid, ArchiCode, Bild, Draw.io, BPMN, HTML, PromptBook) |

### Markdown

```yaml
- id: n001
  type: markdown
  x: 80
  y: 200
  width: 720
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

### ArchiCode

```yaml
- id: n011
  type: archicode
  x: 100
  y: 180
  width: 520
  title: "Orderflöde"
  file: diagrams/n011.ac
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

### BPMN

```yaml
- id: n010
  type: bpmn
  x: 100
  y: 180
  width: 480
  title: "Orderprocess"
  file: diagrams/n010.bpmn
  previewFile: diagrams/n010.png
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

### HTML / iframe

Se [nodtyper ovan](#html--iframe) för flikarna i modalen. I YAML sparas antingen `url` (extern) eller `file` (intern `.html`).

```yaml
- id: n008
  type: html
  source: url
  url: https://blog.yllemo.com
  width: 640
  height: 400
  iframeWidth: 100%
  title: "Min blogg"

- id: n009
  type: html
  source: file
  file: html/min-sida.html
  width: 640
  height: 400
  iframeWidth: 100%
```

---

## Zip-struktur

```
my-skill-2026-05-31.zip
├── SKILL.md
├── nodes/
│   └── n001.md
├── html/
│   └── min-sida.html
├── diagrams/
│   ├── n002.mmd
│   ├── n011.ac
│   ├── n007.drawio
│   ├── n007.png
│   ├── n010.bpmn
│   └── n010.png
├── promptbook/
│   └── n012.json
└── images/
    └── 2026-05-31_14.30.45.png
```

Mappnamn följer konventioner i `config/defaults.php` men styrs i praktiken av `file`-sökvägar i noderna.

---

## Konfiguration

Standardvärden i `config/defaults.php` kan justeras utan kodändring:

- **skill** — `nameBase` (t.ex. `my-skill`), `nameDateSuffix` (lägger till `-YYYY-MM-DD` på ny canvas), `description`, `author`, `version`, `tags`
- **canvas** — zoom-gränser, marginaler vid centrering/fokus
- **edges** — standardlinje, färg, piländar för nya relationer
- **nodes.\*** — standardbredd/höjd, min/max per nodtyp (markdown 720 px, html m.m.)
- **modules.\*** — modaltexter, placeholders, editor-URL:er, note-färger, HTML standard-URL, DOCX-/paint-/drawio-/bpmn-etiketter

Apptitel, språk, favicon och SEO-meta (`description`, `keywords`, författare): `config/app.php`.

`index.php` sätter `SC_APP.basePath` utifrån webbplatsens sökväg så att editor-iframe:ar fungerar även om appen ligger i en undermapp.

---

## Design

Ljust och mörkt tema. Favicon: `favicon.svg` (konfigurerbar i `config/app.php`).

CDN-bibliotek: Mermaid 11, marked, JSZip, js-yaml, html2canvas (PNG-export), Monaco Editor (markdown fullskärm), bpmn-js 18 (BPMN fullskärm), ArchiCode ([yllemo/ArchiCode](https://github.com/yllemo/ArchiCode) via jsDelivr).

Externa tjänster vid redigering: [diagrams.net](https://www.diagrams.net/) (Draw.io embed), [bpmn.io](https://bpmn.io/) (bpmn-js via CDN). Paint-editorn och BPMN/Draw.io-sparning sker lokalt i zip-minnet; Draw.io embed kräver internet.

---

## Kompatibilitet

Testad i Chrome 120+, Edge 120+, Firefox 121+.

- **PHP-app:** kräver webbserver (PHP inbyggd server räcker)
- **All data lokalt** — zip/png laddas ner till disk; Draw.io embed använder internet mot diagrams.net; BPMN-editorn laddar bpmn-js från CDN
- PNG-export renderar en klon av noderna off-screen via html2canvas (2× upplösning)
