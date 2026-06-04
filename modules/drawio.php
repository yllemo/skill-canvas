<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/AbstractModule.php';

final class DrawioModule extends AbstractModule
{
    public function getSlug(): string
    {
        return 'drawio';
    }

    public function getType(): string
    {
        return 'drawio';
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
            <input id="dio-title" placeholder="<?= h($placeholders['title'] ?? 'Diagramtitel…') ?>" autofocus>
        </div>
        <div class="mfield">
            <label><?= h($labels['width'] ?? 'Bredd på kort (px)') ?></label>
            <input id="dio-width"
                   value="<?= h((string) ($nodeDefaults['width'] ?? 480)) ?>"
                   type="number"
                   min="<?= h((string) ($nodeDefaults['minWidth'] ?? 200)) ?>"
                   max="<?= h((string) ($nodeDefaults['maxWidth'] ?? 1200)) ?>">
        </div>
        <p class="note-add-hint" style="font-size:11px;color:var(--text-sec);margin-top:4px">
            <?= h($labels['addHint'] ?? 'Efter att du skapat noden öppnas draw.io så du kan rita direkt.') ?>
        </p>
        <?php
        return (string) ob_get_clean();
    }

    protected function renderEdit(array $values): string
    {
        $labels = $this->config()['labels'] ?? [];
        $title = (string) ($values['title'] ?? '');

        ob_start();
        ?>
        <div class="mfield">
            <label><?= h($labels['title'] ?? 'Titel') ?></label>
            <input id="dio-title" value="<?= h($title) ?>">
        </div>
        <p style="font-size:12px;color:var(--text-sec)">
            <?= h($labels['editHint'] ?? 'Diagrammet redigeras i draw.io — klicka Spara i editorn.') ?>
        </p>
        <?php
        return (string) ob_get_clean();
    }
}

return new DrawioModule();
