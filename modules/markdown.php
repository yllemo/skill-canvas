<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/AbstractModule.php';

final class MarkdownModule extends AbstractModule
{
    public function getSlug(): string
    {
        return 'markdown';
    }

    public function getType(): string
    {
        return 'markdown';
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
            <input id="md-title" placeholder="<?= h($placeholders['title'] ?? '') ?>">
        </div>
        <div class="mfield">
            <label><?= h($labels['width'] ?? 'Bredd (px)') ?></label>
            <input id="md-width"
                   value="<?= h((string) ($nodeDefaults['width'] ?? 400)) ?>"
                   type="number"
                   min="<?= h((string) ($nodeDefaults['minWidth'] ?? 160)) ?>"
                   max="<?= h((string) ($nodeDefaults['maxWidth'] ?? 1200)) ?>">
        </div>
        <div class="mfield">
            <label><?= h($labels['content'] ?? 'Markdown-innehåll') ?></label>
            <textarea id="md-content"
                      class="tall"
                      placeholder="<?= h($placeholders['content'] ?? '') ?>"></textarea>
        </div>
        <?php
        return (string) ob_get_clean();
    }

    protected function renderEdit(array $values): string
    {
        $nodeDefaults = $this->nodeDefaults();
        $labels = $this->config()['labels'] ?? [];

        $title = (string) ($values['title'] ?? '');
        $width = (int) ($values['width'] ?? ($nodeDefaults['width'] ?? 400));
        $content = (string) ($values['content'] ?? '');

        ob_start();
        ?>
        <div class="mfield">
            <label><?= h($labels['title'] ?? 'Titel') ?></label>
            <input id="md-title" value="<?= h($title) ?>">
        </div>
        <div class="mfield">
            <label><?= h($labels['width'] ?? 'Bredd (px)') ?></label>
            <input id="md-width"
                   value="<?= h((string) $width) ?>"
                   type="number"
                   min="<?= h((string) ($nodeDefaults['minWidth'] ?? 160)) ?>"
                   max="<?= h((string) ($nodeDefaults['maxWidth'] ?? 1200)) ?>">
        </div>
        <div class="mfield">
            <label><?= h($labels['content'] ?? 'Markdown-innehåll') ?></label>
            <textarea id="md-content" class="tall"><?= h($content) ?></textarea>
        </div>
        <?php
        return (string) ob_get_clean();
    }
}

return new MarkdownModule();
