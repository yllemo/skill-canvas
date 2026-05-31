<?php
declare(strict_types=1);

require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/module-loader.php';

$app = app_config();
$defaults = defaults_config();
$modules = all_modules();
