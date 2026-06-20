<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/AbstractModule.php';

final class PromptbookModule extends AbstractModule
{
    public function getSlug(): string
    {
        return 'promptbook';
    }

    public function getType(): string
    {
        return 'promptbook';
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
            <input id="pb-node-title" placeholder="<?= h($placeholders['title'] ?? 'Visas på kortet…') ?>" autofocus>
        </div>
        <div class="html-modal-grid">
            <div class="mfield">
                <label><?= h($labels['width'] ?? 'Bredd kort (px)') ?></label>
                <input id="pb-node-width" type="number"
                       value="<?= h((string) ($nodeDefaults['width'] ?? 420)) ?>"
                       min="<?= h((string) ($nodeDefaults['minWidth'] ?? 280)) ?>"
                       max="<?= h((string) ($nodeDefaults['maxWidth'] ?? 900)) ?>">
            </div>
            <div class="mfield">
                <label><?= h($labels['height'] ?? 'Höjd kort (px)') ?></label>
                <input id="pb-node-height" type="number"
                       value="<?= h((string) ($nodeDefaults['height'] ?? 360)) ?>"
                       min="<?= h((string) ($nodeDefaults['minHeight'] ?? 200)) ?>"
                       max="<?= h((string) ($nodeDefaults['maxHeight'] ?? 800)) ?>">
            </div>
        </div>
        <p class="note-add-hint" style="font-size:11px;color:var(--text-sec);margin-top:4px">
            <?= h($labels['addHint'] ?? 'PromptBook-editorn öppnas direkt — redigera prompt och LLM-inställningar där.') ?>
        </p>
        <?php
        return (string) ob_get_clean();
    }

    protected function renderEdit(array $values): string
    {
        $labels = $this->config()['labels'] ?? [];
        $nodeDefaults = $this->nodeDefaults();

        ob_start();
        ?>
        <p style="font-size:13px;color:var(--text-sec);margin:0">
            <?= h($labels['editHint'] ?? 'Fullskärmseditorn öppnas — där redigerar du prompt, testar chatt och LLM-inställningar.') ?>
        </p>
        <div class="mfield" style="margin-top:12px">
            <label><?= h($labels['height'] ?? 'Höjd kort (px)') ?></label>
            <input id="pb-node-height" type="number"
                   value="<?= h((string) ($values['height'] ?? ($nodeDefaults['height'] ?? 360))) ?>"
                   min="<?= h((string) ($nodeDefaults['minHeight'] ?? 200)) ?>"
                   max="<?= h((string) ($nodeDefaults['maxHeight'] ?? 800)) ?>">
        </div>
        <?php
        return (string) ob_get_clean();
    }
}

return new PromptbookModule();
