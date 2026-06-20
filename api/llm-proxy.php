<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/bootstrap.php';

const LLM_PROXY_MAX_BODY = 1_048_576; // 1 MB
const LLM_PROXY_TIMEOUT = 600; // stora lokala modeller (t.ex. 26B)

function llm_proxy_json_error(int $code, string $message): never
{
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

function llm_proxy_is_local_host(string $host): bool
{
    $host = strtolower(trim($host, '[]'));
    if ($host === 'localhost') {
        return true;
    }

    if (!filter_var($host, FILTER_VALIDATE_IP)) {
        return false;
    }

    return filter_var(
        $host,
        FILTER_VALIDATE_IP,
        FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE
    ) === false;
}

function llm_proxy_allowed_path(string $path): bool
{
    static $allowed = [
        '/api/chat',
        '/api/tags',
        '/api/generate',
        '/v1/chat/completions',
        '/v1/models',
    ];

    return in_array($path, $allowed, true);
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    llm_proxy_json_error(405, 'POST krävs');
}

$raw = file_get_contents('php://input');
if ($raw === false || strlen($raw) > LLM_PROXY_MAX_BODY) {
    llm_proxy_json_error(400, 'Ogiltig eller för stor begäran');
}

$payload = json_decode($raw, true);
if (!is_array($payload)) {
    llm_proxy_json_error(400, 'Ogiltig JSON');
}

$baseUrl = trim((string) ($payload['baseUrl'] ?? ''));
$path = trim((string) ($payload['path'] ?? ''));
$method = strtoupper((string) ($payload['method'] ?? 'POST'));
$body = $payload['body'] ?? null;

if ($baseUrl === '' || $path === '') {
    llm_proxy_json_error(400, 'baseUrl och path krävs');
}

if (!in_array($method, ['POST', 'GET'], true)) {
    llm_proxy_json_error(400, 'Otillåten metod');
}

if (!llm_proxy_allowed_path($path)) {
    llm_proxy_json_error(403, 'Otillåten sökväg');
}

$parts = parse_url($baseUrl);
if ($parts === false || empty($parts['host'])) {
    llm_proxy_json_error(400, 'Ogiltig baseUrl');
}

$scheme = strtolower((string) ($parts['scheme'] ?? 'http'));
if (!in_array($scheme, ['http', 'https'], true)) {
    llm_proxy_json_error(400, 'Endast http/https i baseUrl');
}

$host = (string) $parts['host'];
if (!llm_proxy_is_local_host($host)) {
    llm_proxy_json_error(403, 'Proxy tillåter endast localhost och privata nätverksadresser');
}

$port = isset($parts['port']) ? ':' . (int) $parts['port'] : '';
$target = $scheme . '://' . $host . $port . $path;

$jsonBody = null;
if ($method === 'POST') {
    if ($body === null) {
        llm_proxy_json_error(400, 'body krävs för POST');
    }
    $jsonBody = json_encode($body, JSON_UNESCAPED_UNICODE);
    if ($jsonBody === false) {
        llm_proxy_json_error(400, 'Kunde inte serialisera body');
    }
}

if (!function_exists('curl_init')) {
    llm_proxy_json_error(503, 'cURL saknas på servern');
}

$ch = curl_init($target);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CUSTOMREQUEST => $method,
    CURLOPT_TIMEOUT => LLM_PROXY_TIMEOUT,
    CURLOPT_CONNECTTIMEOUT => 15,
    CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Accept: application/json'],
    CURLOPT_PROTOCOLS => CURLPROTO_HTTP | CURLPROTO_HTTPS,
]);
if ($jsonBody !== null) {
    curl_setopt($ch, CURLOPT_POSTFIELDS, $jsonBody);
}

$response = curl_exec($ch);
$httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlErr = curl_error($ch);
curl_close($ch);

if ($response === false) {
    llm_proxy_json_error(502, $curlErr !== ''
        ? 'Kunde inte nå ' . $host . $port . ': ' . $curlErr
        : 'Kunde inte nå ' . $host . $port . ' — kontrollera att Ollama/LM Studio körs lokalt på samma dator som PHP.');
}

http_response_code($httpCode > 0 ? $httpCode : 502);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
echo $response;
