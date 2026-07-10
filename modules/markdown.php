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

    /** @param array<string, mixed> $values */
    private function renderForm(array $values, bool $isEdit): string
    {
        $nodeDefaults = $this->nodeDefaults();
        $labels = $this->config()['labels'] ?? [];
        $placeholders = $this->config()['placeholders'] ?? [];

        $title = (string) ($values['title'] ?? '');
        $width = (int) ($values['width'] ?? ($nodeDefaults['width'] ?? 720));
        $defaultHeight = (int) ($nodeDefaults['height'] ?? 600);
        $heightRaw = $values['height'] ?? null;
        if ($heightRaw === '' || $heightRaw === null) {
            $height = (string) $defaultHeight;
        } else {
            $height = (string) (int) $heightRaw;
        }
        $content = (string) ($values['content'] ?? '');

        ob_start();
        ?>
        <div class="mfield">
            <label><?= h($isEdit ? ($labels['title'] ?? 'Titel') : ($labels['titleOptional'] ?? 'Titel (valfri)')) ?></label>
            <input id="md-title"
                   value="<?= h($title) ?>"
                   placeholder="<?= h($placeholders['title'] ?? '') ?>">
        </div>
        <div class="md-size-grid">
            <div class="mfield">
                <label><?= h($labels['width'] ?? 'Bredd (px)') ?></label>
                <input id="md-width"
                       value="<?= h((string) $width) ?>"
                       type="number"
                       min="<?= h((string) ($nodeDefaults['minWidth'] ?? 160)) ?>"
                       max="<?= h((string) ($nodeDefaults['maxWidth'] ?? 1200)) ?>">
            </div>
            <div class="mfield">
                <label><?= h($labels['height'] ?? 'Höjd (px)') ?></label>
                <input id="md-height"
                       value="<?= h($height) ?>"
                       type="number"
                       min="<?= h((string) ($nodeDefaults['minHeight'] ?? 120)) ?>"
                       max="<?= h((string) ($nodeDefaults['maxHeight'] ?? 1600)) ?>"
                       placeholder="<?= h((string) $defaultHeight) ?>">
            </div>
        </div>
        <p class="field-hint" style="margin:-2px 0 10px"><?= h($labels['heightHint'] ?? 'Standard ' . $defaultHeight . ' px — kan även ändras genom att dra i kortets hörn.') ?></p>
        <div class="mfield">
            <label><?= h($labels['content'] ?? 'Markdown-innehåll') ?></label>
            <textarea id="md-content"
                      class="tall"
                      placeholder="<?= h($placeholders['content'] ?? '') ?>"
                      spellcheck="false"><?= h($content) ?></textarea>
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

return new MarkdownModule();
