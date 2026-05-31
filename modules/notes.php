<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/AbstractModule.php';

final class NotesModule extends AbstractModule
{
    public function getSlug(): string
    {
        return 'notes';
    }

    public function getType(): string
    {
        return 'note';
    }

    protected function renderAdd(): string
    {
        $nodeDefaults = $this->nodeDefaults();
        $labels = $this->config()['labels'] ?? [];
        $colors = $this->config()['colors'] ?? [];
        $defaultColor = (string) ($nodeDefaults['color'] ?? '#fff9a8');

        ob_start();
        ?>
        <div class="mfield">
            <label><?= h($labels['color'] ?? 'Färg') ?></label>
            <div class="note-color-grid" id="note-color-grid">
                <?php foreach ($colors as $i => $color): ?>
                    <?php
                    $value = (string) ($color['value'] ?? '#fff9a8');
                    $label = (string) ($color['label'] ?? 'Färg');
                    $checked = ($i === 0 || $value === $defaultColor) ? 'checked' : '';
                    ?>
                    <label class="note-color-swatch" title="<?= h($label) ?>" style="--swatch:<?= h($value) ?>">
                        <input type="radio" name="note-color" value="<?= h($value) ?>" <?= $checked ? 'checked' : '' ?>>
                        <span></span>
                    </label>
                <?php endforeach; ?>
            </div>
        </div>
        <div class="mfield">
            <label><?= h($labels['width'] ?? 'Bredd (px)') ?></label>
            <input id="note-width"
                   value="<?= h((string) ($nodeDefaults['width'] ?? 220)) ?>"
                   type="number"
                   min="<?= h((string) ($nodeDefaults['minWidth'] ?? 140)) ?>"
                   max="<?= h((string) ($nodeDefaults['maxWidth'] ?? 480)) ?>">
        </div>
        <p class="note-add-hint"><?= h($labels['hint'] ?? 'Texten redigeras direkt på noten efter att du skapat den.') ?></p>
        <?php
        return (string) ob_get_clean();
    }

    protected function renderEdit(array $values): string
    {
        return '';
    }
}

return new NotesModule();
