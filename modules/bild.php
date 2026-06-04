<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/AbstractModule.php';

final class BildModule extends AbstractModule
{
    public function getSlug(): string
    {
        return 'bild';
    }

    public function getType(): string
    {
        return 'image';
    }

    protected function renderAdd(): string
    {
        $nodeDefaults = $this->nodeDefaults();
        $labels = $this->config()['labels'] ?? [];
        $placeholders = $this->config()['placeholders'] ?? [];

        ob_start();
        ?>
        <div class="mfield">
            <label><?= h($labels['upload'] ?? 'Ladda upp bild') ?></label>
            <div class="file-drop-area" id="bild-drop-area" tabindex="0">
                <input type="file" id="bild-file" accept="image/*">
                <?= h($placeholders['upload'] ?? 'Klicka eller dra en bild hit') ?>
                <div class="bild-paste-hint"><?= h($labels['pasteHint'] ?? 'Ctrl+V klistrar in bild från urklipp') ?></div>
                <div id="bild-preview" style="margin-top:10px"></div>
            </div>
        </div>
        <div class="mfield">
            <label><?= h($labels['url'] ?? '— eller — Extern URL') ?></label>
            <input id="bild-url" placeholder="<?= h($placeholders['url'] ?? 'https://…') ?>" type="url">
        </div>
        <div class="mfield">
            <label><?= h($labels['caption'] ?? 'Bildtext (caption)') ?></label>
            <input id="bild-caption" placeholder="<?= h($placeholders['caption'] ?? 'Valfri bildtext') ?>">
        </div>
        <div class="mfield">
            <label><?= h($labels['alt'] ?? 'Alt-text') ?></label>
            <input id="bild-alt" placeholder="<?= h($placeholders['alt'] ?? 'Beskrivning av bilden') ?>">
        </div>
        <div class="mfield">
            <label><?= h($labels['width'] ?? 'Bredd (px)') ?></label>
            <input id="bild-width"
                   value="<?= h((string) ($nodeDefaults['width'] ?? 400)) ?>"
                   type="number"
                   min="<?= h((string) ($nodeDefaults['minWidth'] ?? 120)) ?>"
                   max="<?= h((string) ($nodeDefaults['maxWidth'] ?? 1200)) ?>">
        </div>
        <p class="note-add-hint" style="font-size:11px;color:var(--text-sec);margin-top:4px">
            <?= h($labels['paintHint'] ?? 'Använd knappen nere till vänster för att måla eller redigera bilden.') ?>
        </p>
        <?php
        return (string) ob_get_clean();
    }

    protected function renderEdit(array $values): string
    {
        $nodeDefaults = $this->nodeDefaults();
        $labels = $this->config()['labels'] ?? [];
        $placeholders = $this->config()['placeholders'] ?? [];

        $caption = (string) ($values['caption'] ?? '');
        $alt = (string) ($values['alt'] ?? '');
        $width = (int) ($values['width'] ?? ($nodeDefaults['width'] ?? 400));

        ob_start();
        ?>
        <div class="mfield">
            <label><?= h($labels['caption'] ?? 'Bildtext (caption)') ?></label>
            <input id="bild-caption" value="<?= h($caption) ?>">
        </div>
        <div class="mfield">
            <label><?= h($labels['alt'] ?? 'Alt-text') ?></label>
            <input id="bild-alt" value="<?= h($alt) ?>">
        </div>
        <div class="mfield">
            <label><?= h($labels['width'] ?? 'Bredd (px)') ?></label>
            <input id="bild-width"
                   value="<?= h((string) $width) ?>"
                   type="number"
                   min="<?= h((string) ($nodeDefaults['minWidth'] ?? 120)) ?>"
                   max="<?= h((string) ($nodeDefaults['maxWidth'] ?? 1200)) ?>">
        </div>
        <div class="mfield">
            <label><?= h($labels['replace'] ?? 'Byt bild (valfri)') ?></label>
            <div class="file-drop-area" id="bild-drop-area" tabindex="0">
                <input type="file" id="bild-file" accept="image/*">
                <?= h($placeholders['replace'] ?? 'Välj ny bild') ?>
                <div class="bild-paste-hint"><?= h($labels['pasteHint'] ?? 'Ctrl+V klistrar in bild från urklipp') ?></div>
                <div id="bild-preview" style="margin-top:10px"></div>
            </div>
        </div>
        <p class="note-add-hint" style="font-size:11px;color:var(--text-sec);margin-top:4px">
            <?= h($labels['paintHint'] ?? 'Använd knappen nere till vänster för att måla eller redigera bilden.') ?>
        </p>
        <?php
        return (string) ob_get_clean();
    }
}

return new BildModule();
