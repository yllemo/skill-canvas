<?php
declare(strict_types=1);

function app_config(): array
{
    static $app = null;
    if ($app === null) {
        $app = require dirname(__DIR__) . '/config/app.php';
    }

    return $app;
}

function defaults_config(): array
{
    static $defaults = null;
    if ($defaults === null) {
        $defaults = require dirname(__DIR__) . '/config/defaults.php';
    }

    return $defaults;
}

function h(?string $value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
}

function asset_version(string $file): string
{
    $path = dirname(__DIR__) . DIRECTORY_SEPARATOR . $file;

    return is_file($path) ? (string) filemtime($path) : '1';
}

function module_defaults(string $type): array
{
    $defaults = defaults_config();

    return $defaults['nodes'][$type] ?? [];
}

function module_config(string $module): array
{
    $defaults = defaults_config();

    return $defaults['modules'][$module] ?? [];
}
