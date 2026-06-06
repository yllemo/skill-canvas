<?php
declare(strict_types=1);

require_once __DIR__ . '/helpers.php';

function add_menu_config(): array
{
    static $config = null;
    if ($config === null) {
        $config = require dirname(__DIR__) . '/config/add-menu.php';
    }

    return $config;
}

function render_add_more_menu(): string
{
    $config = add_menu_config();
    $items = $config['items'] ?? [];

    ob_start();
    foreach ($items as $item) {
        $id = h((string) ($item['id'] ?? ''));
        if ($id === '') {
            continue;
        }
        $label = h((string) ($item['label'] ?? $id));
        $desc = trim((string) ($item['description'] ?? ''));
        $enabled = !empty($item['enabled']);
        $soonClass = $enabled ? '' : ' add-more-item-soon';
        $title = $desc !== '' ? ' title="' . h($desc) . '"' : '';
        ?>
        <button type="button"
                class="add-more-item<?= $soonClass ?>"
                role="menuitem"
                data-add-menu="<?= $id ?>"
                data-enabled="<?= $enabled ? '1' : '0' ?>"<?= $title ?>>
            <span class="add-more-item-label"><?= $label ?></span>
            <?php if (!$enabled): ?>
                <span class="add-more-item-badge">Snart</span>
            <?php endif; ?>
        </button>
        <?php
    }

    return (string) ob_get_clean();
}
