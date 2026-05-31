<?php
declare(strict_types=1);

/** @var array<string, object|null> */
$GLOBALS['_sc_module_cache'] = $GLOBALS['_sc_module_cache'] ?? [];

/** @var array<string, string>|null */
$GLOBALS['_sc_module_registry'] = $GLOBALS['_sc_module_registry'] ?? null;

function load_module(string $slug): ?object
{
    $safe = preg_replace('/[^a-z0-9_-]/', '', strtolower($slug));
    if ($safe === '') {
        return null;
    }

    if (array_key_exists($safe, $GLOBALS['_sc_module_cache'])) {
        return $GLOBALS['_sc_module_cache'][$safe];
    }

    $path = dirname(__DIR__) . '/modules/' . $safe . '.php';
    if (!is_file($path)) {
        $GLOBALS['_sc_module_cache'][$safe] = null;

        return null;
    }

    $module = require_once $path;
    $module = is_object($module) ? $module : null;
    $GLOBALS['_sc_module_cache'][$safe] = $module;

    return $module;
}

function load_module_by_type(string $type): ?object
{
    $map = registered_modules();

    if (!isset($map[$type])) {
        return null;
    }

    return load_module($map[$type]);
}

/** @return array<string, string> nodtyp => filnamn utan .php */
function registered_modules(): array
{
    if ($GLOBALS['_sc_module_registry'] !== null) {
        return $GLOBALS['_sc_module_registry'];
    }

    $modules = [];
    $dir = dirname(__DIR__) . '/modules';

    if (is_dir($dir)) {
        foreach (glob($dir . '/*.php') ?: [] as $file) {
            $slug = basename($file, '.php');
            $module = load_module($slug);
            if ($module === null || !method_exists($module, 'getType')) {
                continue;
            }

            $slugName = method_exists($module, 'getSlug') ? $module->getSlug() : $slug;
            $modules[$module->getType()] = $slugName;
        }
    }

    $GLOBALS['_sc_module_registry'] = $modules;

    return $modules;
}

/** @return list<string> */
function registered_module_scripts(): array
{
    $scripts = [];
    foreach (array_unique(array_values(registered_modules())) as $slug) {
        $path = "js/modules/{$slug}.js";
        if (is_file(dirname(__DIR__) . '/' . $path)) {
            $scripts[] = $path;
        }
    }

    return $scripts;
}

/** @return array<string, object> slug => modulobjekt */
function all_modules(): array
{
    $loaded = [];
    foreach (array_unique(array_values(registered_modules())) as $slug) {
        $module = load_module($slug);
        if ($module !== null) {
            $loaded[$slug] = $module;
        }
    }

    return $loaded;
}
