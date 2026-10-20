<?php
/**
 * ExpertinAEO — Meta & Heading Checker
 * Analyzes a public URL's meta tags, heading structure and on-page elements.
 */
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');

$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$rlFile = sys_get_temp_dir() . '/expertinaeo_meta_rl.json';
$rl = is_file($rlFile) ? (json_decode((string) file_get_contents($rlFile), true) ?: []) : [];
$now = time();
$rl[$ip] = array_values(array_filter($rl[$ip] ?? [], fn($t) => $t > $now - 3600));
$rl[$ip][] = $now;
if (count($rl[$ip]) > 20) { http_response_code(429); echo json_encode(['ok' => false, 'message' => 'Rate limit exceeded.']); exit; }
file_put_contents($rlFile, json_encode($rl), LOCK_EX);

$inputUrl = trim($_POST['url'] ?? $_GET['url'] ?? '');
if ($inputUrl === '') { http_response_code(400); echo json_encode(['ok' => false, 'message' => 'Please provide a URL.']); exit; }
if (!preg_match('#^https?://#i', $inputUrl)) $inputUrl = 'https://' . $inputUrl;
$url = filter_var($inputUrl, FILTER_VALIDATE_URL);
if ($url === false) { http_response_code(400); echo json_encode(['ok' => false, 'message' => 'Invalid URL.']); exit; }
$parts = parse_url($url);
$host = $parts['host'] ?? '';
$ipList = gethostbynamel($host);
if ($ipList === false) { http_response_code(400); echo json_encode(['ok' => false, 'message' => 'DNS resolution failed.']); exit; }
foreach ($ipList as $resolvedIp) {
    if (!filter_var($resolvedIp, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
        http_response_code(400); echo json_encode(['ok' => false, 'message' => 'Private IP blocked.']); exit;
    }
}

$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL => $url, CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true, CURLOPT_MAXREDIRS => 3,
    CURLOPT_CONNECTTIMEOUT => 10, CURLOPT_TIMEOUT => 15,
    CURLOPT_SSL_VERIFYPEER => true, CURLOPT_SSL_VERIFYHOST => 2,
    CURLOPT_USERAGENT => 'ExpertinAEO-Meta-Checker/1.0 (+https://expertinaeo.com)',
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

// Meta
$title = '';
foreach ($xpath->query('//title') as $t) { $title = trim($t->textContent); break; }

$metaDesc = '';
foreach ($xpath->query('//meta[@name="description"]') as $m) { $metaDesc = trim($m->getAttribute('content')); break; }

$metaRobots = '';
foreach ($xpath->query('//meta[@name="robots"]') as $m) { $metaRobots = strtolower(trim($m->getAttribute('content'))); break; }

$viewport = '';
foreach ($xpath->query('//meta[@name="viewport"]') as $m) { $viewport = trim($m->getAttribute('content')); break; }

$charset = '';
foreach ($xpath->query('//meta[@charset]') as $m) { $charset = trim($m->getAttribute('charset')); break; }

$canonical = '';
foreach ($xpath->query('//link[@rel="canonical"]') as $c) { $canonical = trim($c->getAttribute('href')); break; }

$ogTitle = ''; $ogDesc = ''; $ogImage = ''; $ogUrl = ''; $ogType = '';
foreach ($xpath->query('//meta[@property="og:title"]') as $m) { $ogTitle = trim($m->getAttribute('content')); break; }
foreach ($xpath->query('//meta[@property="og:description"]') as $m) { $ogDesc = trim($m->getAttribute('content')); break; }
foreach ($xpath->query('//meta[@property="og:image"]') as $m) { $ogImage = trim($m->getAttribute('content')); break; }
foreach ($xpath->query('//meta[@property="og:url"]') as $m) { $ogUrl = trim($m->getAttribute('content')); break; }
foreach ($xpath->query('//meta[@property="og:type"]') as $m) { $ogType = trim($m->getAttribute('content')); break; }

$twitterCard = '';
foreach ($xpath->query('//meta[@name="twitter:card"]') as $m) { $twitterCard = trim($m->getAttribute('content')); break; }

$htmlLang = '';
if ($dom->documentElement && $dom->documentElement->hasAttribute('lang')) {
    $htmlLang = $dom->documentElement->getAttribute('lang');
}

// Headings
$headings = ['h1' => [], 'h2' => [], 'h3' => [], 'h4' => []];
foreach (array_keys($headings) as $tag) {
    foreach ($xpath->query('//' . $tag) as $h) {
        $text = trim($h->textContent);
        if ($text !== '') $headings[$tag][] = mb_substr($text, 0, 200);
    }
}

// Outline (heading structure in order)
$outline = [];
foreach ($xpath->query('//h1 | //h2 | //h3 | //h4') as $h) {
    $tag = strtolower($h->tagName);
    $text = trim($h->textContent);
    if ($text !== '') {
        $outline[] = ['tag' => $tag, 'text' => mb_substr($text, 0, 200)];
    }
}

// Checks
$checks = [];
$checks[] = ['name' => 'Title tag present', 'status' => $title !== '' ? 'pass' : 'fail', 'detail' => $title !== '' ? "Title: \"{$title}\" (" . mb_strlen($title) . " chars)" : 'No <title> tag found.', 'priority' => 'high'];
$checks[] = ['name' => 'Title length (50–60 chars)', 'status' => (mb_strlen($title) >= 30 && mb_strlen($title) <= 70) ? 'pass' : 'warn', 'detail' => 'Title is ' . mb_strlen($title) . ' chars. Best practice: 50–60 chars.', 'priority' => 'med'];
$checks[] = ['name' => 'Meta description present', 'status' => $metaDesc !== '' ? 'pass' : 'warn', 'detail' => $metaDesc !== '' ? "Description: \"" . mb_substr($metaDesc, 0, 80) . "...\" (" . mb_strlen($metaDesc) . " chars)" : 'No meta description found.', 'priority' => 'high'];
$checks[] = ['name' => 'Meta description length (120–160 chars)', 'status' => (mb_strlen($metaDesc) >= 80 && mb_strlen($metaDesc) <= 160) ? 'pass' : 'warn', 'detail' => 'Meta description is ' . mb_strlen($metaDesc) . ' chars. Best practice: 120–160 chars.', 'priority' => 'med'];
$checks[] = ['name' => 'Exactly one H1', 'status' => count($headings['h1']) === 1 ? 'pass' : 'warn', 'detail' => count($headings['h1']) . ' H1 tag(s) found. Best practice: exactly one.', 'priority' => 'med'];
$checks[] = ['name' => 'Canonical URL', 'status' => $canonical !== '' ? 'pass' : 'warn', 'detail' => $canonical !== '' ? "Canonical: {$canonical}" : 'No canonical URL found.', 'priority' => 'med'];
$checks[] = ['name' => 'Meta robots directive', 'status' => strpos($metaRobots, 'noindex') !== false ? 'warn' : 'pass', 'detail' => $metaRobots !== '' ? "robots: {$metaRobots}" : 'No robots directive (default: index, follow).', 'priority' => 'low'];
$checks[] = ['name' => 'Viewport meta tag', 'status' => $viewport !== '' ? 'pass' : 'fail', 'detail' => $viewport !== '' ? "viewport: {$viewport}" : 'No viewport meta tag. Mobile-unfriendly.', 'priority' => 'high'];
$checks[] = ['name' => 'HTML lang attribute', 'status' => $htmlLang !== '' ? 'pass' : 'warn', 'detail' => $htmlLang !== '' ? "lang=\"{$htmlLang}\"" : 'No lang attribute on <html>.', 'priority' => 'med'];
$checks[] = ['name' => 'Open Graph tags', 'status' => ($ogTitle !== '' && $ogDesc !== '' && $ogImage !== '') ? 'pass' : 'warn', 'detail' => "og:title: " . ($ogTitle !== '' ? 'yes' : 'no') . "; og:description: " . ($ogDesc !== '' ? 'yes' : 'no') . "; og:image: " . ($ogImage !== '' ? 'yes' : 'no') . "; og:url: " . ($ogUrl !== '' ? 'yes' : 'no') . "; og:type: " . ($ogType !== '' ? 'yes' : 'no') . ".", 'priority' => 'med'];
$checks[] = ['name' => 'Twitter card', 'status' => $twitterCard !== '' ? 'pass' : 'warn', 'detail' => $twitterCard !== '' ? "twitter:card: {$twitterCard}" : 'No twitter:card meta tag found.', 'priority' => 'low'];
$checks[] = ['name' => 'Heading hierarchy (H1 → H2 → H3)', 'status' => count($headings['h1']) > 0 && count($headings['h2']) > 0 ? 'pass' : 'warn', 'detail' => "Found " . count($headings['h1']) . " H1, " . count($headings['h2']) . " H2, " . count($headings['h3']) . " H3, " . count($headings['h4']) . " H4.", 'priority' => 'med'];

$pass = 0; $total = count($checks);
foreach ($checks as $c) {
    if ($c['status'] === 'pass') $pass++;
    elseif ($c['status'] === 'warn') $pass += 0.5;
}
$score = (int) round(($pass / $total) * 100);

echo json_encode([
    'ok' => true,
    'requested_url' => $url,
    'fetched_url' => $info['url'] ?? $url,
    'http_code' => (int)($info['http_code'] ?? 0),
    'fetched_at' => gmdate('c'),
    'score' => $score,
    'meta' => [
        'title' => $title,
        'title_length' => mb_strlen($title),
        'meta_description' => $metaDesc,
        'meta_description_length' => mb_strlen($metaDesc),
        'meta_robots' => $metaRobots,
        'viewport' => $viewport,
        'charset' => $charset,
        'canonical' => $canonical,
        'html_lang' => $htmlLang,
        'open_graph' => [
            'og:title' => $ogTitle, 'og:description' => $ogDesc, 'og:image' => $ogImage,
            'og:url' => $ogUrl, 'og:type' => $ogType,
        ],
        'twitter_card' => $twitterCard,
    ],
    'headings' => $headings,
    'outline' => array_slice($outline, 0, 40),
    'checks' => $checks,
    'disclaimer' => 'Heuristic meta and heading analysis. Use alongside schema and content checks for full AEO readiness.',
]);
