<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/AbstractModule.php';

final class ArchicodeModule extends AbstractModule
{
    public function getSlug(): string
    {
        return 'archicode';
    }

    public function getType(): string
    {
        return 'archicode';
    }

    /** @param array<string, mixed> $values */
    private function renderForm(array $values, bool $isEdit): string
    {
        $nodeDefaults = $this->nodeDefaults();
        $labels = $this->config()['labels'] ?? [];
        $placeholders = $this->config()['placeholders'] ?? [];

        $title = (string) ($values['title'] ?? '');
        $width = (int) ($values['width'] ?? ($nodeDefaults['width'] ?? 520));
        $content = (string) ($values['content'] ?? '');

        ob_start();
        ?>
        <div class="mfield">
            <label><?= h($isEdit ? ($labels['title'] ?? 'Titel') : ($labels['titleOptional'] ?? 'Titel (valfri)')) ?></label>
            <input id="ac-title"
                   value="<?= h($title) ?>"
                   placeholder="<?= h($placeholders['title'] ?? 'Diagramtitel…') ?>"
                   <?= $isEdit ? '' : 'autofocus' ?>>
        </div>
        <div class="mfield">
            <label><?= h($labels['width'] ?? 'Bredd kort (px)') ?></label>
            <input id="ac-width"
                   value="<?= h((string) $width) ?>"
                   type="number"
                   min="<?= h((string) ($nodeDefaults['minWidth'] ?? 200)) ?>"
                   max="<?= h((string) ($nodeDefaults['maxWidth'] ?? 1400)) ?>">
        </div>
        <div class="mfield">
            <label><?= h($labels['content'] ?? 'ArchiCode-kod') ?></label>
            <textarea id="ac-content"
                      class="tall"
                      placeholder="<?= h($placeholders['content'] ?? '[<business:actor> Kund] -> [<business:process> Order]') ?>"
                      spellcheck="false"><?= h($content) ?></textarea>
            <p class="ac-modal-hint" style="font-size:11px;color:var(--text-sec);margin-top:6px;line-height:1.45">
                <?= h($labels['editorHint'] ?? 'Tips: öppna ArchiCode-editorn (knapp nere till vänster) för Monaco, live-förhandsvisning och SVG-export.') ?>
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

return new ArchicodeModule();
