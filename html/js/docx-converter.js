/**
 * DOCX → Markdown + images (mammoth)
 */
(function (global) {
  'use strict';

  function base64ToBlob(base64, mimeType) {
    const bytes = atob(base64);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    return new Blob([arr], { type: mimeType });
  }

  function htmlToMarkdown(html, imageMap) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div id="root">${html}</div>`, 'text/html');
    const root = doc.getElementById('root');

    function processNode(node, indent) {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent.replace(/\n/g, ' ');
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return '';

      const tag = node.tagName.toLowerCase();
      const children = () => Array.from(node.childNodes).map(n => processNode(n, indent)).join('');

      switch (tag) {
        case 'h1': return `\n# ${children().trim()}\n`;
        case 'h2': return `\n## ${children().trim()}\n`;
        case 'h3': return `\n### ${children().trim()}\n`;
        case 'h4': return `\n#### ${children().trim()}\n`;
        case 'h5': return `\n##### ${children().trim()}\n`;
        case 'h6': return `\n###### ${children().trim()}\n`;
        case 'p': {
          const t = children().trim();
          return t ? `\n${t}\n` : '';
        }
        case 'strong':
        case 'b':
          return `**${children()}**`;
        case 'em':
        case 'i':
          return `*${children()}*`;
        case 'u':
          return `<u>${children()}</u>`;
        case 's':
        case 'strike':
          return `~~${children()}~~`;
        case 'code':
          return `\`${children()}\``;
        case 'pre':
          return `\n\`\`\`\n${node.textContent}\n\`\`\`\n`;
        case 'blockquote':
          return `\n> ${children().trim()}\n`;
        case 'a': {
          const href = node.getAttribute('href') || '';
          return `[${children()}](${href})`;
        }
        case 'img': {
          const alt = node.getAttribute('alt') || 'bild';
          const src = node.getAttribute('src') || '';
          if (src.startsWith('data:') && imageMap[alt]) {
            return `\n![${alt}](${alt})\n`;
          }
          return `\n![${alt}](${src})\n`;
        }
        case 'ul':
          return '\n' + Array.from(node.children).map(li =>
            `- ${processNode(li, indent + '  ').trim()}`
          ).join('\n') + '\n';
        case 'ol':
          return '\n' + Array.from(node.children).map((li, i) =>
            `${i + 1}. ${processNode(li, indent + '   ').trim()}`
          ).join('\n') + '\n';
        case 'li':
          return children();
        case 'table':
          return processTable(node);
        case 'br':
          return '\n';
        case 'hr':
          return '\n---\n';
        case 'div':
        case 'section':
        case 'article':
          return `\n${children()}\n`;
        case 'span':
          return children();
        default:
          return children();
      }
    }

    function processTable(table) {
      const rows = Array.from(table.querySelectorAll('tr'));
      if (!rows.length) return '';
      const toText = cell => Array.from(cell.childNodes).map(n => processNode(n, '')).join('').trim()
        .replace(/\|/g, '\\|').replace(/\n/g, ' ');
      const headers = Array.from(rows[0].querySelectorAll('th, td')).map(toText);
      const separator = headers.map(() => '---');
      const bodyRows = rows.slice(1).map(row =>
        Array.from(row.querySelectorAll('th, td')).map(toText)
      );
      const fmtRow = cols => `| ${cols.join(' | ')} |`;
      return '\n' + [
        fmtRow(headers),
        fmtRow(separator),
        ...bodyRows.map(fmtRow),
      ].join('\n') + '\n';
    }

    let md = processNode(root, '');
    return md.replace(/\n{3,}/g, '\n\n').trim();
  }

  /**
   * @param {File} file
   * @param {{ imageDir?: string, onProgress?: (n:number)=>void }} opts
   * @returns {Promise<{ markdown: string, images: Array<{name:string, path:string, mimeType:string, base64:string, blob:Blob}>, warnings: string[] }>}
   */
  async function processDocxFile(file, opts) {
    const imageDir = (opts && opts.imageDir) || 'images';
    const onProgress = (opts && opts.onProgress) || (() => {});

    onProgress(10);
    const arrayBuffer = await file.arrayBuffer();
    onProgress(25);

    const imageMap = {};
    let imgCounter = 0;

    const result = await mammoth.convertToHtml({ arrayBuffer }, {
      convertImage: mammoth.images.imgElement(async (img) => {
        imgCounter++;
        const ext = (img.contentType.split('/')[1] || 'png').replace(/jpeg/, 'jpg');
        const name = `image_${String(imgCounter).padStart(3, '0')}.${ext}`;
        const path = `${imageDir}/${name}`;
        const base64 = await img.read('base64');
        const blob = base64ToBlob(base64, img.contentType);
        imageMap[path] = { name, path, base64, mimeType: img.contentType, blob };
        return { src: `data:${img.contentType};base64,${base64}`, alt: path };
      }),
    });

    onProgress(55);
    const markdown = htmlToMarkdown(result.value, imageMap);
    onProgress(75);

    const images = Object.values(imageMap);
    const warnings = (result.messages || [])
      .filter(m => m.type === 'warning')
      .map(m => m.message);

    onProgress(100);
    return { markdown, images, warnings };
  }

  global.DocxConverter = {
    processDocxFile,
    htmlToMarkdown,
    base64ToBlob,
  };
})(typeof window !== 'undefined' ? window : globalThis);
