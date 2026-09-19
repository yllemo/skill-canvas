<?php
declare(strict_types=1);

require_once __DIR__ . '/helpers.php';

function settings_config(): array
{
    static $settings = null;
    if ($settings === null) {
        $settings = require dirname(__DIR__) . '/config/settings.php';
    }

    return $settings;
}

/** @param array<string, mixed> $values */
function render_settings_panel(array $values = []): string
{
    $config = settings_config();
    $defaults = $config['defaults'] ?? [];
    $themeColors = $config['themeColors'] ?? [];
    $appTheme = app_config()['theme'] ?? 'light';
    $themeFallback = $themeColors[$appTheme] ?? $themeColors['light'] ?? [];
    $groups = $config['groups'] ?? [];

    ob_start();
    foreach ($groups as $group) {
        $groupId = h((string) ($group['id'] ?? ''));
        $groupLabel = h((string) ($group['label'] ?? ''));
        ?>
        <fieldset class="settings-group" data-settings-group="<?= $groupId ?>">
            <legend class="settings-group-title"><?= $groupLabel ?></legend>
            <?php foreach ($group['settings'] ?? [] as $setting):
                $key = (string) ($setting['key'] ?? '');
                if ($key === '') {
                    continue;
                }
                $current = (string) ($values[$key] ?? $defaults[$key] ?? '');
                echo render_setting_field($setting, $current, $themeFallback);
            endforeach; ?>
        </fieldset>
        <?php
    }

    return (string) ob_get_clean();
}

/** @param array<string, mixed> $setting @param array<string, string> $themeFallback */
function render_setting_field(array $setting, string $current, array $themeFallback = []): string
{
    $type = (string) ($setting['type'] ?? 'choice');
    $key = h((string) ($setting['key'] ?? ''));

    return match ($type) {
        'choice' => render_setting_choice($setting, $key, $current),
        'color' => render_setting_color($setting, $key, $current, $themeFallback),
        'text', 'password' => render_setting_text($setting, $key, $current, $type),
        default => '',
    };
}

/** @param array<string, mixed> $setting */
function render_setting_text(array $setting, string $key, string $current, string $type = 'text'): string
{
    $label = h((string) ($setting['label'] ?? ''));
    $description = trim((string) ($setting['description'] ?? ''));
    $placeholder = h((string) ($setting['placeholder'] ?? ''));
    $autocomplete = h((string) ($setting['autocomplete'] ?? 'off'));
    $inputId = h('sc-setting-' . $key);
    $inputType = $type === 'password' ? 'password' : 'text';

    ob_start();
    ?>
    <div class="settings-field settings-field-text" data-setting="<?= $key ?>">
        <label class="settings-label" for="<?= $inputId ?>"><?= $label ?></label>
        <?php if ($description !== ''): ?>
            <p class="settings-hint"><?= h($description) ?></p>
        <?php endif; ?>
        <input type="<?= $inputType ?>"
               id="<?= $inputId ?>"
               class="settings-text-input"
               value="<?= h($current) ?>"
               placeholder="<?= $placeholder ?>"
               autocomplete="<?= $autocomplete ?>"
               spellcheck="false"
               data-setting-key="<?= $key ?>"
               data-setting-type="<?= h($type) ?>">
    </div>
    <?php

    return (string) ob_get_clean();
}

/** @param array<string, mixed> $setting */
function render_setting_choice(array $setting, string $key, string $current): string
{
    $label = h((string) ($setting['label'] ?? ''));
    $description = trim((string) ($setting['description'] ?? ''));
    $options = $setting['options'] ?? [];
    $compact = !empty($setting['compact']);
    $choicesClass = $compact ? 'settings-choices settings-choices-compact' : 'settings-choices';

    ob_start();
    ?>
    <div class="settings-field" data-setting="<?= $key ?>">
        <span class="settings-label"><?= $label ?></span>
        <?php if ($description !== ''): ?>
            <p class="settings-hint"><?= h($description) ?></p>
        <?php endif; ?>
        <div class="<?= h($choicesClass) ?>" role="radiogroup" aria-label="<?= $label ?>">
            <?php foreach ($options as $option):
                $value = h((string) ($option['value'] ?? ''));
                $optLabel = h((string) ($option['label'] ?? $value));
                $checked = $current === (string) ($option['value'] ?? '') ? ' checked' : '';
                $inputId = h('sc-setting-' . $key . '-' . $value);
                $choiceClass = $compact ? 'settings-choice settings-choice-compact' : 'settings-choice';
                ?>
                <label class="<?= h($choiceClass) ?>" for="<?= $inputId ?>">
                    <input type="radio"
                           id="<?= $inputId ?>"
                           name="sc-setting-<?= $key ?>"
                           value="<?= $value ?>"
                           data-setting-key="<?= $key ?>"<?= $checked ?>>
                    <?php if (!$compact): ?>
                    <span class="settings-choice-preview settings-preview-<?= $value ?>" aria-hidden="true"></span>
                    <?php endif; ?>
                    <span class="settings-choice-text"><?= $optLabel ?></span>
                </label>
            <?php endforeach; ?>
        </div>
    </div>
    <?php

    return (string) ob_get_clean();
}

/** @param array<string, mixed> $setting @param array<string, string> $themeFallback */
function render_setting_color(array $setting, string $key, string $current, array $themeFallback = []): string
{
    $label = h((string) ($setting['label'] ?? ''));
    $description = trim((string) ($setting['description'] ?? ''));
    $whenBackground = $setting['whenBackground'] ?? null;
    $isCustom = $current !== '';
    $fallbackKey = $key === 'canvasGridColor' ? 'grid' : 'canvasBg';
    $pickerValue = $isCustom ? $current : settings_color_to_hex($themeFallback[$fallbackKey] ?? '#888888');
    $inputId = h('sc-setting-' . $key);
    $whenAttr = is_array($whenBackground)
        ? ' data-when-background="' . h(implode(',', $whenBackground)) . '"'
        : '';

    ob_start();
    ?>
    <div class="settings-field settings-field-color" data-setting="<?= $key ?>"<?= $whenAttr ?>>
        <span class="settings-label"><?= $label ?></span>
        <?php if ($description !== ''): ?>
            <p class="settings-hint"><?= h($description) ?></p>
        <?php endif; ?>
        <div class="settings-color-row">
            <label class="settings-color-swatch" for="<?= $inputId ?>" title="Välj färg">
                <input type="color"
                       id="<?= $inputId ?>"
                       class="settings-color-input"
                       value="<?= h($pickerValue) ?>"
                       data-setting-key="<?= $key ?>"
                       data-setting-type="color">
            </label>
            <span class="settings-color-value" data-setting-display="<?= $key ?>"><?= $isCustom ? h($current) : 'Temastandard' ?></span>
            <button type="button"
                    class="settings-color-reset"
                    data-setting-reset="<?= $key ?>"
                    <?= $isCustom ? '' : ' hidden' ?>>Återställ</button>
        </div>
    </div>
    <?php

    return (string) ob_get_clean();
}

function settings_color_to_hex(string $color): string
{
    $color = trim($color);
    if (preg_match('/^#([0-9a-f]{3}|[0-9a-f]{6})$/i', $color)) {
        if (strlen($color) === 4) {
            return '#' . $color[1] . $color[1] . $color[2] . $color[2] . $color[3] . $color[3];
        }

        return strtoupper($color);
    }

    if (preg_match('/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i', $color, $m)) {
        return sprintf('#%02X%02X%02X', (int) $m[1], (int) $m[2], (int) $m[3]);
    }

    return '#888888';
}
