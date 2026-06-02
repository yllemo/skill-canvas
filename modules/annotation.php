<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/AbstractModule.php';

final class AnnotationModule extends AbstractModule
{
    public function getSlug(): string
    {
        return 'annotation';
    }

    public function getType(): string
    {
        return 'annotation';
    }

    /** @param array<string, mixed> $values */
    protected function renderForm(array $values, bool $isEdit): string
    {
        $nodeDefaults = $this->nodeDefaults();
        $labels = $this->config()['labels'] ?? [];
        $colors = $this->config()['colors'] ?? [];
        $dirs = $this->config()['directions'] ?? [];
        $arrowStyles = $this->config()['arrowStyles'] ?? [];
        $fonts = $this->config()['fonts'] ?? [];

        $content = (string) ($values['content'] ?? '');
        $width = (int) ($values['width'] ?? ($nodeDefaults['width'] ?? 320));
        $height = (int) ($values['height'] ?? ($nodeDefaults['height'] ?? 160));
        $tipX = (float) ($values['tipX'] ?? ($nodeDefaults['tipX'] ?? 300));
        $tipY = (float) ($values['tipY'] ?? ($nodeDefaults['tipY'] ?? 120));
        $dir = (string) ($values['dir'] ?? ($nodeDefaults['dir'] ?? 'ne'));
        $arrowStyle = (string) ($values['arrowStyle'] ?? ($nodeDefaults['arrowStyle'] ?? 'curve'));
        $arrowLen = (float) ($values['arrowLen'] ?? ($nodeDefaults['arrowLen'] ?? 90));
        $rotation = (float) ($values['rotation'] ?? ($nodeDefaults['rotation'] ?? 0));
        $color = (string) ($values['color'] ?? ($nodeDefaults['color'] ?? '#F5A623'));
        $fontSize = (float) ($values['fontSize'] ?? ($nodeDefaults['fontSize'] ?? 26));
        $strokeWidth = (float) ($values['strokeWidth'] ?? ($nodeDefaults['strokeWidth'] ?? 2.5));
        $fontFamily = (string) ($values['fontFamily'] ?? ($nodeDefaults['fontFamily'] ?? "'Caveat', cursive"));

        ob_start();
        ?>
        <div class="ann-modal-form">
            <div class="ann-preview-wrap" id="ann-preview-wrap">
                <svg id="ann-preview" class="ann-preview-svg" xmlns="http://www.w3.org/2000/svg"></svg>
            </div>
            <p class="ann-preview-hint"><?= h($labels['previewHint'] ?? 'Klicka i förhandsvisningen för att placera pilens spets') ?></p>
            <input type="hidden" id="ann-tip-x" value="<?= h((string) $tipX) ?>">
            <input type="hidden" id="ann-tip-y" value="<?= h((string) $tipY) ?>">

            <div class="mfield">
                <label><?= h($labels['text'] ?? 'Text') ?></label>
                <textarea id="ann-text" rows="3" placeholder="<?= h($labels['textPlaceholder'] ?? 'Förklaringstext…') ?>"><?= h($content) ?></textarea>
            </div>

            <div class="ann-modal-grid">
                <div class="mfield ann-field-full">
                    <label><?= h($labels['direction'] ?? 'Pil-riktning') ?></label>
                    <div class="ann-seg-btns" id="ann-dir-btns">
                        <?php foreach ($dirs as $d): ?>
                            <?php
                            $code = (string) ($d['value'] ?? '');
                            $active = $code === $dir ? ' active' : '';
                            ?>
                            <button type="button" class="<?= trim('ann-dir-btn' . $active) ?>" data-dir="<?= h($code) ?>"><?= h((string) ($d['label'] ?? $code)) ?></button>
                        <?php endforeach; ?>
                    </div>
                </div>

                <div class="mfield">
                    <label><?= h($labels['arrowStyle'] ?? 'Pilform') ?></label>
                    <select id="ann-arrow-style">
                        <?php foreach ($arrowStyles as $s): ?>
                            <?php $val = (string) ($s['value'] ?? ''); ?>
                            <option value="<?= h($val) ?>" <?= $val === $arrowStyle ? 'selected' : '' ?>><?= h((string) ($s['label'] ?? $val)) ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>

                <div class="mfield">
                    <label><?= h($labels['font'] ?? 'Textstil') ?></label>
                    <select id="ann-font">
                        <?php foreach ($fonts as $f): ?>
                            <?php $val = (string) ($f['value'] ?? ''); ?>
                            <option value="<?= h($val) ?>" <?= $val === $fontFamily ? 'selected' : '' ?>><?= h((string) ($f['label'] ?? $val)) ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>

                <div class="mfield">
                    <label><?= h($labels['fontSize'] ?? 'Textstorlek') ?></label>
                    <div class="ann-range-row">
                        <input type="range" id="ann-font-size" min="14" max="48" step="1" value="<?= h((string) $fontSize) ?>">
                        <span class="ann-range-val" id="ann-font-size-out"><?= h((string) (int) $fontSize) ?></span>
                    </div>
                </div>

                <div class="mfield">
                    <label><?= h($labels['strokeWidth'] ?? 'Pilbredd') ?></label>
                    <div class="ann-range-row">
                        <input type="range" id="ann-stroke-w" min="1" max="6" step="0.5" value="<?= h((string) $strokeWidth) ?>">
                        <span class="ann-range-val" id="ann-stroke-w-out"><?= h((string) $strokeWidth) ?></span>
                    </div>
                </div>

                <div class="mfield">
                    <label><?= h($labels['arrowLen'] ?? 'Pilens längd') ?></label>
                    <div class="ann-range-row">
                        <input type="range" id="ann-arrow-len" min="40" max="180" step="5" value="<?= h((string) $arrowLen) ?>">
                        <span class="ann-range-val" id="ann-arrow-len-out"><?= h((string) (int) $arrowLen) ?></span>
                    </div>
                </div>

                <div class="mfield">
                    <label><?= h($labels['rotation'] ?? 'Rotation') ?></label>
                    <div class="ann-range-row">
                        <input type="range" id="ann-rotation" min="-45" max="45" step="1" value="<?= h((string) $rotation) ?>">
                        <span class="ann-range-val" id="ann-rotation-out"><?= h((string) (int) $rotation) ?>°</span>
                    </div>
                </div>

                <div class="mfield">
                    <label><?= h($labels['width'] ?? 'Bredd på canvas (px)') ?></label>
                    <input id="ann-width" type="number"
                           value="<?= h((string) $width) ?>"
                           min="<?= h((string) ($nodeDefaults['minWidth'] ?? 120)) ?>"
                           max="<?= h((string) ($nodeDefaults['maxWidth'] ?? 800)) ?>">
                </div>

                <div class="mfield">
                    <label><?= h($labels['height'] ?? 'Höjd på canvas (px)') ?></label>
                    <input id="ann-height" type="number"
                           value="<?= h((string) $height) ?>"
                           min="<?= h((string) ($nodeDefaults['minHeight'] ?? 80)) ?>"
                           max="<?= h((string) ($nodeDefaults['maxHeight'] ?? 400)) ?>">
                </div>

                <div class="mfield ann-field-full">
                    <label><?= h($labels['color'] ?? 'Färg') ?></label>
                    <div class="ann-color-swatches" id="ann-swatches">
                        <?php foreach ($colors as $c): ?>
                            <?php
                            $val = (string) ($c['value'] ?? '');
                            $active = $val === $color ? ' active' : '';
                            ?>
                            <button type="button" class="ann-color-btn<?= $active ?>" data-color="<?= h($val) ?>" title="<?= h((string) ($c['label'] ?? '')) ?>" style="background:<?= h($val) ?>"></button>
                        <?php endforeach; ?>
                        <input type="color" id="ann-color" value="<?= h($color) ?>" title="<?= h($labels['customColor'] ?? 'Valfri färg') ?>">
                    </div>
                </div>
            </div>
        </div>
        <?php
        return (string) ob_get_clean();
    }

    protected function renderAdd(): string
    {
        return $this->renderForm([], false);
    }

    /** @param array<string, mixed> $values */
    protected function renderEdit(array $values): string
    {
        return $this->renderForm($values, true);
    }
}

return new AnnotationModule();
