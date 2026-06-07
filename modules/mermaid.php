<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/AbstractModule.php';

final class MermaidModule extends AbstractModule
{
    public function getSlug(): string
    {
        return 'mermaid';
    }

    public function getType(): string
    {
        return 'mermaid';
    }

    /** @param array<string, mixed> $values */
    private function renderForm(array $values, bool $isEdit): string
    {
        $nodeDefaults = $this->nodeDefaults();
        $labels = $this->config()['labels'] ?? [];
        $placeholders = $this->config()['placeholders'] ?? [];

        $title = (string) ($values['title'] ?? '');
        $width = (int) ($values['width'] ?? ($nodeDefaults['width'] ?? 500));
        $content = (string) ($values['content'] ?? '');

        ob_start();
        ?>
        <div class="mfield">
            <label><?= h($isEdit ? ($labels['title'] ?? 'Titel') : ($labels['titleOptional'] ?? 'Titel (valfri)')) ?></label>
            <input id="mm-title"
                   value="<?= h($title) ?>"
                   placeholder="<?= h($placeholders['title'] ?? 'Diagramtitel…') ?>"
                   <?= $isEdit ? '' : 'autofocus' ?>>
        </div>
        <div class="mfield">
            <label><?= h($labels['width'] ?? 'Bredd kort (px)') ?></label>
            <input id="mm-width"
                   value="<?= h((string) $width) ?>"
                   type="number"
                   min="<?= h((string) ($nodeDefaults['minWidth'] ?? 160)) ?>"
                   max="<?= h((string) ($nodeDefaults['maxWidth'] ?? 1400)) ?>">
        </div>
        <div class="mfield">
            <label><?= h($labels['content'] ?? 'Mermaid-kod') ?></label>
            <textarea id="mm-content"
                      class="tall"
                      placeholder="<?= h($placeholders['content'] ?? "flowchart LR\n  A[Start] --> B[Slut]") ?>"
                      spellcheck="false"><?= h($content) ?></textarea>
            <p class="mm-modal-hint" style="font-size:11px;color:var(--text-sec);margin-top:6px;line-height:1.45">
                <?= h($labels['editorHint'] ?? 'Tips: öppna Mermaid-editorn (knapp nere till vänster) för Monaco, live-förhandsvisning, exempeldiagram och export.') ?>
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

return new MermaidModule();
