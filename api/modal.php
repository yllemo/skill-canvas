<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/bootstrap.php';

$moduleName = (string) ($_GET['module'] ?? '');
$mode = (string) ($_GET['mode'] ?? 'add');

if (!in_array($mode, ['add', 'edit'], true)) {
    http_response_code(400);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Ogiltigt läge. Använd add eller edit.']);
    exit;
}

$module = load_module($moduleName) ?? load_module_by_type($moduleName);
if ($module === null || !method_exists($module, 'render')) {
    http_response_code(404);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Modulen hittades inte.']);
    exit;
}

$values = [];
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $raw = file_get_contents('php://input');
    $decoded = json_decode($raw ?: '{}', true);
    $values = is_array($decoded) ? $decoded : [];
}

$meta = method_exists($module, 'getMeta') ? $module->getMeta() : [];
$title = match ($mode) {
    'add' => (string) ($meta['addTitle'] ?? 'Lägg till'),
    'edit' => (string) ($meta['editTitle'] ?? 'Redigera'),
    default => 'Modal',
};
$okLabel = (string) ($meta['okLabel'] ?? 'Spara');

header('Content-Type: application/json; charset=utf-8');
echo json_encode([
    'title' => $title,
    'okLabel' => $okLabel,
    'html' => $module->render($mode, $values),
    'meta' => $meta,
], JSON_UNESCAPED_UNICODE);
