<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/bootstrap.php';

const ARCHIVE_MAX_BYTES = 52_428_800; // 50 MB

function archive_json_error(int $code, string $message): never
{
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

function archive_is_private_ip(string $ip): bool
{
    if (!filter_var($ip, FILTER_VALIDATE_IP)) {
        return true;
    }

    return filter_var(
        $ip,
        FILTER_VALIDATE_IP,
        FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE
    ) === false;
}

function archive_validate_remote_url(string $raw): array
{
    $raw = trim($raw);
    if ($raw === '') {
        return ['ok' => false, 'error' => 'Ingen URL angiven'];
    }

    $parts = parse_url($raw);
    if ($parts === false) {
        return ['ok' => false, 'error' => 'Ogiltig URL'];
    }

    $scheme = strtolower((string) ($parts['scheme'] ?? ''));
    if (!in_array($scheme, ['http', 'https'], true)) {
        return ['ok' => false, 'error' => 'Endast http/https-URL:er stöds'];
    }

    $path = strtolower((string) ($parts['path'] ?? ''));
    $base = basename($path);
    if (!preg_match('/\.(zip|skill)$/i', $base)) {
        return ['ok' => false, 'error' => 'URL måste peka på en .zip- eller .skill-fil'];
    }

    $host = strtolower((string) ($parts['host'] ?? ''));
    if ($host === '' || $host === 'localhost') {
        return ['ok' => false, 'error' => 'URL pekar på otillåten adress'];
    }

    $ips = gethostbynamel($host);
    if ($ips === false || $ips === []) {
        return ['ok' => false, 'error' => 'Kunde inte slå upp värden för URL:en'];
    }

    foreach ($ips as $ip) {
        if (archive_is_private_ip($ip)) {
            return ['ok' => false, 'error' => 'URL pekar på otillåten adress'];
        }
    }

    return ['ok' => true, 'url' => $raw, 'name' => rawurldecode($base)];
}

function archive_fetch_bytes(string $url): array
{
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_MAXREDIRS => 5,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_CONNECTTIMEOUT => 15,
            CURLOPT_USERAGENT => 'Skill-Canvas/1.0',
            CURLOPT_PROTOCOLS => CURLPROTO_HTTP | CURLPROTO_HTTPS,
            CURLOPT_REDIR_PROTOCOLS => CURLPROTO_HTTP | CURLPROTO_HTTPS,
        ]);
        $body = curl_exec($ch);
        $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err = curl_error($ch);
        curl_close($ch);

        if ($body === false) {
            return ['ok' => false, 'error' => $err !== '' ? $err : 'Hämtning misslyckades'];
        }
        if ($code < 200 || $code >= 300) {
            return ['ok' => false, 'error' => 'HTTP ' . $code];
        }
        if (strlen($body) > ARCHIVE_MAX_BYTES) {
            return ['ok' => false, 'error' => 'Filen är för stor (max 50 MB)'];
        }

        return ['ok' => true, 'body' => $body];
    }

    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'timeout' => 30,
            'follow_location' => 1,
            'max_redirects' => 5,
            'header' => "User-Agent: Skill-Canvas/1.0\r\n",
        ],
        'ssl' => [
            'verify_peer' => true,
            'verify_peer_name' => true,
        ],
    ]);

    $body = @file_get_contents($url, false, $context);
    if ($body === false) {
        return ['ok' => false, 'error' => 'Hämtning misslyckades'];
    }
    if (strlen($body) > ARCHIVE_MAX_BYTES) {
        return ['ok' => false, 'error' => 'Filen är för stor (max 50 MB)'];
    }

    return ['ok' => true, 'body' => $body];
}

$url = trim((string) ($_GET['url'] ?? ''));
$validated = archive_validate_remote_url($url);
if (!$validated['ok']) {
    archive_json_error(400, (string) $validated['error']);
}

$fetched = archive_fetch_bytes((string) $validated['url']);
if (!$fetched['ok']) {
    archive_json_error(502, (string) $fetched['error']);
}

$name = (string) ($validated['name'] ?? 'remote.skill');
header('Content-Type: application/octet-stream');
header('Content-Disposition: inline; filename="' . str_replace('"', '', $name) . '"');
header('X-Archive-Name: ' . $name);
header('Cache-Control: no-store');
echo $fetched['body'];
