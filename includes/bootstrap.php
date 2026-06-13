<?php
declare(strict_types=1);

require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/head-meta.php';
require_once __DIR__ . '/module-loader.php';
require_once __DIR__ . '/settings.php';
require_once __DIR__ . '/add-menu.php';

$app = app_config();
$defaults = defaults_config();
$modules = all_modules();
