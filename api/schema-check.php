<?php
/**
 * ExpertinAEO — Schema Checker
 * Inspects JSON-LD on a public URL. SSRF-safe (mirrors analyze.php).
 */
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');

$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$rlFile = sys_get_temp_dir() . '/expertinaeo_schema_rl.json';
$rl = is_file($rlFile) ? (json_decode((string) file_get_contents($rlFile), true) ?: []) : [];
$now = time();
$rl[$ip] = array_values(array_filter($rl[$ip] ?? [], fn($t) => $t > $now - 3600));
$rl[$ip][] = $now;
if (count($rl[$ip]) > 20) { http_response_code(429); echo json_encode(['ok' => false, 'message' => 'Rate limit exceeded.']); exit; }
file_put_contents($rlFile, json_encode($rl), LOCK_EX);

$inputUrl = trim($_POST['url'] ?? $_GET['url'] ?? '');
if ($inputUrl === '' ) { http_response_code(400); echo json_encode(['ok' => false, 'message' => 'Please provide a URL.']); exit; }
if (!preg_match('#^https?://#i', $inputUrl)) $inputUrl = 'https://' . $inputUrl;
$url = filter_var($inputUrl, FILTER_VALIDATE_URL);
if ($url === false) { http_response_code(400); echo json_encode(['ok' => false, 'message' => 'Invalid URL.']); exit; }
$parts = parse_url($url);
$host = $parts['host'] ?? '';
if (!$host) { http_response_code(400); echo json_encode(['ok' => false, 'message' => 'Invalid host.']); exit; }
$ipList = gethostbynamel($host);
if ($ipList === false) { http_response_code(400); echo json_encode(['ok' => false, 'message' => 'DNS resolution failed.']); exit; }
foreach ($ipList as $resolvedIp) {
    if (!filter_var($resolvedIp, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
        http_response_code(400); echo json_encode(['ok' => false, 'message' => 'Private/reserved IP ranges not analyzed.']); exit;
    }
}

$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL => $url, CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true, CURLOPT_MAXREDIRS => 3,
    CURLOPT_CONNECTTIMEOUT => 10, CURLOPT_TIMEOUT => 15,
    CURLOPT_SSL_VERIFYPEER => true, CURLOPT_SSL_VERIFYHOST => 2,
    CURLOPT_USERAGENT => 'ExpertinAEO-Schema-Checker/1.0 (+https://expertinaeo.com)',
    CURLOPT_MAXFILESIZE => 2 * 1024 * 1024,
    CURLOPT_PROTOCOLS => CURLPROTO_HTTP | CURLPROTO_HTTPS,
]);
$body = curl_exec($ch);
$info = curl_getinfo($ch);
curl_close($ch);
if ($body === false) { http_response_code(502); echo json_encode(['ok' => false, 'message' => 'Could not fetch URL.']); exit; }

libxml_use_internal_errors(true);
$dom = new DOMDocument();
$dom->loadHTML('<?xml encoding="UTF-8">' . $body, LIBXML_NOWARNING | LIBXML_NOERROR);
$xpath = new DOMXPath($dom);

$schemas = [];
foreach ($xpath->query("//script[@type='application/ld+json']") as $i => $script) {
    $raw = trim($script->textContent);
    if ($raw === '') continue;
    $decoded = json_decode($raw, true);
    $entry = [
        'index' => $i,
        'raw' => mb_substr($raw, 0, 2000),
        'valid' => ($decoded !== null),
        'parse_error' => $decoded === null ? json_last_error_msg() : null,
    ];
    if ($decoded !== null) {
        $items = [];
        if (isset($decoded['@graph']) && is_array($decoded['@graph'])) {
            $items = $decoded['@graph'];
        } elseif (isset($decoded[0]) && is_array($decoded[0])) {
            $items = $decoded;
        } else {
            $items = [$decoded];
        }
        $types = [];
        foreach ($items as $item) {
            if (!is_array($item)) continue;
            $t = $item['@type'] ?? null;
            if (is_array($t)) {
                foreach ($t as $sub) $types[] = $sub;
            } elseif ($t) $types[] = $t;
        }
        $entry['types'] = array_values(array_unique($types));
        $entry['item_count'] = count($items);
        $entry['has_context'] = isset($decoded['@context']) || isset($items[0]['@context']);
        // Specific property checks
        $entry['has_sameAs'] = (bool) preg_match('/"sameAs"\s*:/', $raw);
        $entry['has_author'] = (bool) preg_match('/"author"\s*:/', $raw);
        $entry['has_datePublished'] = (bool) preg_match('/"datePublished"\s*:/', $raw);
        $entry['has_image'] = (bool) preg_match('/"image"\s*:/', $raw);
    }
    $schemas[] = $entry;
}

echo json_encode([
    'ok' => true,
    'requested_url' => $url,
    'fetched_url' => $info['url'] ?? $url,
    'http_code' => (int)($info['http_code'] ?? 0),
    'schema_block_count' => count($schemas),
    'valid_block_count' => count(array_filter($schemas, fn($s) => $s['valid'])),
    'schemas' => $schemas,
    'fetched_at' => gmdate('c'),
    'disclaimer' => 'Heuristic schema inspection. Validates JSON parse and basic property presence — not full schema.org conformance. Use Google Rich Results Test for full validation.',
]);
