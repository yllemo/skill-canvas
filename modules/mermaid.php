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

    protected function renderAdd(): string
    {
        $nodeDefaults = $this->nodeDefaults();
        $labels = $this->config()['labels'] ?? [];
        $placeholders = $this->config()['placeholders'] ?? [];

        ob_start();
        ?>
        <div class="mfield">
            <label><?= h($labels['titleOptional'] ?? 'Titel (valfri)') ?></label>
            <input id="mm-title" placeholder="<?= h($placeholders['title'] ?? 'Diagramtitel…') ?>">
        </div>
        <div class="mfield">
            <label><?= h($labels['width'] ?? 'Bredd (px)') ?></label>
            <input id="mm-width"
                   value="<?= h((string) ($nodeDefaults['width'] ?? 500)) ?>"
                   type="number"
                   min="<?= h((string) ($nodeDefaults['minWidth'] ?? 160)) ?>"
                   max="<?= h((string) ($nodeDefaults['maxWidth'] ?? 1400)) ?>">
        </div>
        <div class="mfield">
            <label><?= h($labels['content'] ?? 'Mermaid-kod') ?></label>
            <textarea id="mm-content"
                      class="tall"
                      placeholder="<?= h($placeholders['content'] ?? "flowchart LR\n  A[Start] --> B[Slut]") ?>"></textarea>
        </div>
        <?php
        return (string) ob_get_clean();
    }

    protected function renderEdit(array $values): string
    {
        $nodeDefaults = $this->nodeDefaults();
        $labels = $this->config()['labels'] ?? [];

        $title = (string) ($values['title'] ?? '');
        $width = (int) ($values['width'] ?? ($nodeDefaults['width'] ?? 500));
        $content = (string) ($values['content'] ?? '');

        ob_start();
        ?>
        <div class="mfield">
            <label><?= h($labels['title'] ?? 'Titel') ?></label>
            <input id="mm-title" value="<?= h($title) ?>">
        </div>
        <div class="mfield">
            <label><?= h($labels['width'] ?? 'Bredd (px)') ?></label>
            <input id="mm-width"
                   value="<?= h((string) $width) ?>"
                   type="number"
                   min="<?= h((string) ($nodeDefaults['minWidth'] ?? 160)) ?>"
                   max="<?= h((string) ($nodeDefaults['maxWidth'] ?? 1400)) ?>">
        </div>
        <div class="mfield">
            <label><?= h($labels['content'] ?? 'Mermaid-kod') ?></label>
            <textarea id="mm-content" class="tall"><?= h($content) ?></textarea>
        </div>
        <?php
        return (string) ob_get_clean();
    }
}

return new MermaidModule();
