<?php
declare(strict_types=1);

/**
 * HTML-kommentar (syns inte på sidan) + SEO-meta för Skill Canvas.
 *
 * @param array<string, mixed> $app App-konfiguration från config/app.php
 * @param string|null $pageDescription Valfri sid-specifik beskrivning (annars $app['description'])
 */
function render_head_meta(array $app, ?string $pageDescription = null): void
{
    $title = (string) ($app['title'] ?? 'Skill Canvas');
    $author = (string) ($app['author'] ?? 'Henrik Yllemo');
    $repo = (string) ($app['repository'] ?? 'https://github.com/yllemo/skill-canvas');
    $description = $pageDescription ?? (string) ($app['description'] ?? '');
    $keywords = (string) ($app['keywords'] ?? '');
    ?>
<?php if ($description !== ''): ?>
<meta name="description" content="<?= h($description) ?>">
<?php endif; ?>
<?php if ($keywords !== ''): ?>
<meta name="keywords" content="<?= h($keywords) ?>">
<?php endif; ?>
<meta name="author" content="<?= h($author) ?>">
<meta name="application-name" content="<?= h($title) ?>">
<meta name="robots" content="index, follow">
<link rel="author" href="<?= h($repo) ?>">
<?php
}

function render_head_comment(array $app): void
{
    $title = (string) ($app['title'] ?? 'Skill Canvas');
    $author = (string) ($app['author'] ?? 'Henrik Yllemo');
    $repo = (string) ($app['repository'] ?? 'https://github.com/yllemo/skill-canvas');
    ?>
<!--
  <?= h($title) ?> – open source whiteboard för transparenta, återanvändbara AI-skills (Markdown, SKILL.md).
  Öppen källkod — skapad av <?= h($author) ?>.
  Källkod och bidrag: <?= h($repo) ?>
-->
<?php
}
