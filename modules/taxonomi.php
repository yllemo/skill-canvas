<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/AbstractModule.php';

final class TaxonomiModule extends AbstractModule
{
    public function getSlug(): string
    {
        return 'taxonomi';
    }

    public function getType(): string
    {
        return 'taxonomi';
    }

    /** @param array<string, mixed> $values */
    private function renderForm(array $values, bool $isEdit): string
    {
        $nodeDefaults = $this->nodeDefaults();
        $labels = $this->config()['labels'] ?? [];
        $placeholders = $this->config()['placeholders'] ?? [];

        $title = (string) ($values['title'] ?? '');
        $width = (int) ($values['width'] ?? ($nodeDefaults['width'] ?? 520));
        $heightRaw = $values['height'] ?? '';
        $height = ($heightRaw === '' || $heightRaw === null) ? '' : (string) (int) $heightRaw;
        $content = (string) ($values['content'] ?? '');

        ob_start();
        ?>
        <div class="mfield">
            <label><?= h($isEdit ? ($labels['title'] ?? 'Titel') : ($labels['titleOptional'] ?? 'Titel (valfri)')) ?></label>
            <input id="tx-title"
                   value="<?= h($title) ?>"
                   placeholder="<?= h($placeholders['title'] ?? 'Taxonomins titel…') ?>"
                   <?= $isEdit ? '' : 'autofocus' ?>>
        </div>
        <div class="mfield">
            <label><?= h($labels['width'] ?? 'Bredd kort (px)') ?></label>
            <input id="tx-width"
                   value="<?= h((string) $width) ?>"
                   type="number"
                   min="<?= h((string) ($nodeDefaults['minWidth'] ?? 200)) ?>"
                   max="<?= h((string) ($nodeDefaults['maxWidth'] ?? 1200)) ?>">
        </div>
        <div class="mfield">
            <label><?= h($labels['height'] ?? 'Höjd (px)') ?></label>
            <input id="tx-height"
                   value="<?= h($height) ?>"
                   type="number"
                   min="<?= h((string) ($nodeDefaults['minHeight'] ?? 120)) ?>"
                   max="<?= h((string) ($nodeDefaults['maxHeight'] ?? 1200)) ?>"
                   placeholder="<?= h($placeholders['height'] ?? 'Automatisk') ?>">
        </div>
        <p class="field-hint" style="margin:-2px 0 10px"><?= h($labels['heightHint'] ?? 'Tomt = automatisk höjd. Ange px för fast höjd med scroll.') ?></p>
        <div class="mfield">
            <label><?= h($labels['content'] ?? 'Markdown (punktlista)') ?></label>
            <textarea id="tx-content"
                      class="tall"
                      placeholder="<?= h($placeholders['content'] ?? "- Nivå 1\n  - Nivå 2") ?>"
                      spellcheck="false"><?= h($content) ?></textarea>
            <p class="mm-modal-hint" style="font-size:11px;color:var(--text-sec);margin-top:6px;line-height:1.45">
                <?= h($labels['editorHint'] ?? 'Tips: öppna Taxonomi-editorn för visualisering, färger och PNG-förhandsbild.') ?>
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

return new TaxonomiModule();
