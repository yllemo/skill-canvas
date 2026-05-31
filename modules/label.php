<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/AbstractModule.php';

final class LabelModule extends AbstractModule
{
    public function getSlug(): string
    {
        return 'label';
    }

    public function getType(): string
    {
        return 'label';
    }

    protected function renderAdd(): string
    {
        $nodeDefaults = $this->nodeDefaults();
        $labels = $this->config()['labels'] ?? [];
        $placeholders = $this->config()['placeholders'] ?? [];

        ob_start();
        ?>
        <div class="mfield">
            <label><?= h($labels['content'] ?? 'Text') ?></label>
            <input id="lbl-content"
                   placeholder="<?= h($placeholders['content'] ?? 'Rubrik eller rubriktext…') ?>"
                   autofocus>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
            <div class="mfield">
                <label><?= h($labels['fontSize'] ?? 'Teckenstorlek (px)') ?></label>
                <input id="lbl-fontsize"
                       value="<?= h((string) ($nodeDefaults['fontSize'] ?? 28)) ?>"
                       type="number"
                       min="<?= h((string) ($nodeDefaults['minFontSize'] ?? 10)) ?>"
                       max="<?= h((string) ($nodeDefaults['maxFontSize'] ?? 120)) ?>">
            </div>
            <div class="mfield">
                <label><?= h($labels['color'] ?? 'Färg') ?></label>
                <input id="lbl-color"
                       value="<?= h($nodeDefaults['color'] ?? '#0077bc') ?>"
                       type="color"
                       style="height:38px;padding:2px 4px">
            </div>
            <div class="mfield">
                <label><?= h($labels['widthOptional'] ?? 'Bredd (px, valfri)') ?></label>
                <input id="lbl-width"
                       value=""
                       type="number"
                       min="<?= h((string) ($nodeDefaults['minWidth'] ?? 80)) ?>"
                       max="<?= h((string) ($nodeDefaults['maxWidth'] ?? 2000)) ?>"
                       placeholder="<?= h($placeholders['width'] ?? 'auto') ?>">
            </div>
        </div>
        <?php
        return (string) ob_get_clean();
    }

    protected function renderEdit(array $values): string
    {
        $nodeDefaults = $this->nodeDefaults();
        $labels = $this->config()['labels'] ?? [];
        $placeholders = $this->config()['placeholders'] ?? [];

        $content = (string) ($values['content'] ?? '');
        $fontSize = (int) ($values['fontSize'] ?? ($nodeDefaults['fontSize'] ?? 28));
        $color = (string) ($values['color'] ?? ($nodeDefaults['color'] ?? '#0077bc'));
        $width = isset($values['width']) && $values['width'] !== '' ? (int) $values['width'] : null;

        ob_start();
        ?>
        <div class="mfield">
            <label><?= h($labels['content'] ?? 'Text') ?></label>
            <input id="lbl-content" value="<?= h($content) ?>">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
            <div class="mfield">
                <label><?= h($labels['fontSize'] ?? 'Teckenstorlek (px)') ?></label>
                <input id="lbl-fontsize"
                       value="<?= h((string) $fontSize) ?>"
                       type="number"
                       min="<?= h((string) ($nodeDefaults['minFontSize'] ?? 10)) ?>"
                       max="<?= h((string) ($nodeDefaults['maxFontSize'] ?? 120)) ?>">
            </div>
            <div class="mfield">
                <label><?= h($labels['color'] ?? 'Färg') ?></label>
                <input id="lbl-color"
                       value="<?= h($color) ?>"
                       type="color"
                       style="height:38px;padding:2px 4px">
            </div>
            <div class="mfield">
                <label><?= h($labels['widthOptional'] ?? 'Bredd (px, valfri)') ?></label>
                <input id="lbl-width"
                       value="<?= $width !== null ? h((string) $width) : '' ?>"
                       type="number"
                       min="<?= h((string) ($nodeDefaults['minWidth'] ?? 80)) ?>"
                       max="<?= h((string) ($nodeDefaults['maxWidth'] ?? 2000)) ?>"
                       placeholder="<?= h($placeholders['width'] ?? 'auto') ?>">
            </div>
        </div>
        <?php
        return (string) ob_get_clean();
    }
}

return new LabelModule();
