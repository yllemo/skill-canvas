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
        if (isset($defaults['skill']) && is_array($defaults['skill'])) {
            $defaults['skill']['name'] = skill_default_name($defaults['skill']);
        }
    }

    return $defaults;
}

function skill_name_base(array $skill): string
{
    $base = (string) ($skill['nameBase'] ?? $skill['name'] ?? 'my-skill');

    return (string) preg_replace('/-\d{4}-\d{2}-\d{2}$/', '', $base);
}

function skill_default_name(?array $skill = null): string
{
    $skill ??= defaults_config()['skill'] ?? [];
    $base = skill_name_base($skill);
    if (empty($skill['nameDateSuffix'])) {
        return $base;
    }

    return $base . '-' . date('Y-m-d');
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
