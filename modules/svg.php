<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/AbstractModule.php';

final class SvgModule extends AbstractModule
{
    public function getSlug(): string
    {
        return 'svg';
    }

    public function getType(): string
    {
        return 'svg';
    }

    /** @param array<string, mixed> $values */
    private function renderForm(array $values, bool $isEdit): string
    {
        $nodeDefaults = $this->nodeDefaults();
        $labels = $this->config()['labels'] ?? [];
        $placeholders = $this->config()['placeholders'] ?? [];

        $title = (string) ($values['title'] ?? '');
        $width = (int) ($values['width'] ?? ($nodeDefaults['width'] ?? 480));
        $content = (string) ($values['content'] ?? '');

        ob_start();
        ?>
        <div class="mfield">
            <label><?= h($isEdit ? ($labels['title'] ?? 'Titel') : ($labels['titleOptional'] ?? 'Titel (valfri)')) ?></label>
            <input id="sv-title"
                   value="<?= h($title) ?>"
                   placeholder="<?= h($placeholders['title'] ?? 'SVG-titel…') ?>"
                   <?= $isEdit ? '' : 'autofocus' ?>>
        </div>
        <div class="mfield">
            <label><?= h($labels['width'] ?? 'Bredd kort (px)') ?></label>
            <input id="sv-width"
                   value="<?= h((string) $width) ?>"
                   type="number"
                   min="<?= h((string) ($nodeDefaults['minWidth'] ?? 160)) ?>"
                   max="<?= h((string) ($nodeDefaults['maxWidth'] ?? 1200)) ?>">
        </div>
        <div class="mfield">
            <label><?= h($labels['content'] ?? 'SVG-kod') ?></label>
            <textarea id="sv-content"
                      class="tall"
                      placeholder="<?= h($placeholders['content'] ?? '<svg xmlns=…>') ?>"
                      spellcheck="false"><?= h($content) ?></textarea>
            <p class="mm-modal-hint" style="font-size:11px;color:var(--text-sec);margin-top:6px;line-height:1.45">
                <?= h($labels['editorHint'] ?? 'Tips: öppna SVG Studio (knapp nere till vänster) för Monaco och live-förhandsvisning. Kortet renderar SVG direkt från källkoden.') ?>
            </p>
        </div>
        <?php
        return (string) ob_get_clean();
    }

    protected function renderAdd(): string
    {
        return $this->renderForm([], false);
    }

    protected function renderEdit(array $values): string
    {
        return $this->renderForm($values, true);
    }
}

return new SvgModule();
