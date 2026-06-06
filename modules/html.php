<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/AbstractModule.php';

final class HtmlModule extends AbstractModule
{
    public function getSlug(): string
    {
        return 'html';
    }

    public function getType(): string
    {
        return 'html';
    }

    private function defaultUrl(): string
    {
        $nodeDefaults = $this->nodeDefaults();

        return (string) ($nodeDefaults['defaultUrl'] ?? 'https://blog.yllemo.com');
    }

    private function starterHtml(): string
    {
        return (string) ($this->config()['starterHtml'] ?? '<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Skill HTML</title>
</head>
<body>
  <h1>Hej!</h1>
  <p>Redigera HTML — filen sparas i skill-paketet.</p>
</body>
</html>');
    }

    private function fileBaseName(string $path): string
    {
        $base = basename(str_replace('\\', '/', $path));

        return preg_replace('/\.html?$/i', '', $base) ?: '';
    }

    /** @param array<string, mixed> $values */
    private function renderForm(array $values, bool $isEdit): string
    {
        $nodeDefaults = $this->nodeDefaults();
        $labels = $this->config()['labels'] ?? [];
        $placeholders = $this->config()['placeholders'] ?? [];

        $source = (string) ($values['source'] ?? 'url');
        if ($source !== 'file') {
            $source = 'url';
        }

        $title = (string) ($values['title'] ?? '');
        $url = (string) ($values['url'] ?? $this->defaultUrl());
        $content = (string) ($values['content'] ?? $this->starterHtml());
        $fileName = (string) ($values['fileName'] ?? '');
        if ($fileName === '' && !empty($values['file'])) {
            $fileName = $this->fileBaseName((string) $values['file']);
        }

        $height = (int) ($values['height'] ?? ($nodeDefaults['height'] ?? 400));
        $width = (int) ($values['width'] ?? ($nodeDefaults['width'] ?? 640));
        $fileDir = (string) ($nodeDefaults['fileDir'] ?? 'html');

        ob_start();
        ?>
        <div class="html-modal">
            <div class="mfield">
                <label><?= h($isEdit ? ($labels['title'] ?? 'Titel') : ($labels['titleOptional'] ?? 'Titel (valfri)')) ?></label>
                <input id="html-title"
                       value="<?= h($title) ?>"
                       placeholder="<?= h($placeholders['title'] ?? 'Visas i nodhandtaget…') ?>"
                       <?= $isEdit ? '' : 'autofocus' ?>>
            </div>

            <div class="html-tab-bar" role="tablist" aria-label="<?= h($labels['source'] ?? 'Källa') ?>">
                <button type="button"
                        role="tab"
                        class="html-tab<?= $source === 'url' ? ' is-active' : '' ?>"
                        data-html-tab="url"
                        aria-selected="<?= $source === 'url' ? 'true' : 'false' ?>"
                        aria-controls="html-panel-url">
                    <?= h($labels['tabIframe'] ?? 'iFrame') ?>
                </button>
                <button type="button"
                        role="tab"
                        class="html-tab<?= $source === 'file' ? ' is-active' : '' ?>"
                        data-html-tab="file"
                        aria-selected="<?= $source === 'file' ? 'true' : 'false' ?>"
                        aria-controls="html-panel-file">
                    <?= h($labels['tabHtml'] ?? 'HTML') ?>
                </button>
            </div>
            <input type="hidden" id="html-source" value="<?= h($source) ?>">

            <div id="html-panel-url"
                 class="html-tab-panel<?= $source === 'url' ? ' is-active' : '' ?>"
                 role="tabpanel">
                <div class="mfield">
                    <label><?= h($labels['url'] ?? 'Website URL') ?></label>
                    <input id="html-url"
                           type="url"
                           value="<?= h($url) ?>"
                           placeholder="<?= h($placeholders['url'] ?? 'https://blog.yllemo.com') ?>"
                           autocomplete="off"
                           spellcheck="false">
                    <p class="html-field-hint"><?= h($labels['urlHint'] ?? 'Extern sida inbäddad via iframe.') ?></p>
                </div>
            </div>

            <div id="html-panel-file"
                 class="html-tab-panel<?= $source === 'file' ? ' is-active' : '' ?>"
                 role="tabpanel">
                <div class="mfield">
                    <label><?= h($labels['fileName'] ?? 'Filnamn') ?></label>
                    <div class="html-filename-row">
                        <span class="html-filename-prefix"><?= h($fileDir) ?>/</span>
                        <input id="html-filename"
                               value="<?= h($fileName) ?>"
                               placeholder="<?= h($placeholders['fileName'] ?? 'min-sida') ?>"
                               autocomplete="off"
                               spellcheck="false"
                               aria-describedby="html-file-path-preview">
                        <span class="html-filename-suffix">.html</span>
                    </div>
                    <p id="html-file-path-preview" class="html-field-hint html-file-path-preview"></p>
                </div>
                <div class="mfield">
                    <label><?= h($labels['htmlContent'] ?? 'HTML-kod') ?></label>
                    <textarea id="html-content" class="tall html-content-editor" spellcheck="false"><?= h($content) ?></textarea>
                    <p class="html-field-hint"><?= h($labels['fileHint'] ?? 'Sparas i zip/skill och visas i iframe på canvas — samma som extern URL.') ?></p>
                </div>
            </div>

            <div class="html-modal-shared">
                <div class="html-modal-shared-head"><?= h($labels['displaySection'] ?? 'Visning på canvas') ?></div>
                <div class="html-modal-grid">
                    <div class="mfield">
                        <label><?= h($labels['iframeHeight'] ?? 'Höjd (px)') ?></label>
                        <input id="html-iframe-height"
                               type="number"
                               value="<?= h((string) $height) ?>"
                               min="<?= h((string) ($nodeDefaults['minHeight'] ?? 120)) ?>"
                               max="<?= h((string) ($nodeDefaults['maxHeight'] ?? 1200)) ?>">
                    </div>
                    <div class="mfield">
                        <label><?= h($labels['cardWidth'] ?? 'Bredd kort (px)') ?></label>
                        <input id="html-width"
                               type="number"
                               value="<?= h((string) $width) ?>"
                               min="<?= h((string) ($nodeDefaults['minWidth'] ?? 200)) ?>"
                               max="<?= h((string) ($nodeDefaults['maxWidth'] ?? 1400)) ?>">
                    </div>
                </div>
            </div>

            <details class="html-code-details" open>
                <summary><?= h($labels['iframeCode'] ?? 'iframe-kod') ?></summary>
                <textarea id="html-code-preview" class="html-code-preview" readonly spellcheck="false" rows="3"></textarea>
            </details>
        </div>
        <?php
        return (string) ob_get_clean();
    }

    protected function renderAdd(): string
    {
        return $this->renderForm([
            'source' => 'url',
            'url' => $this->defaultUrl(),
        ], false);
    }

    protected function renderEdit(array $values): string
    {
        return $this->renderForm($values, true);
    }
}

return new HtmlModule();
