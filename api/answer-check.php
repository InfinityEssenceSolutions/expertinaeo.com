<?php
/**
 * ExpertinAEO — Answer Checker
 * Inspects a public URL (or pasted content) for direct-answer patterns.
 */
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');

$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$rlFile = sys_get_temp_dir() . '/expertinaeo_answer_rl.json';
$rl = is_file($rlFile) ? (json_decode((string) file_get_contents($rlFile), true) ?: []) : [];
$now = time();
$rl[$ip] = array_values(array_filter($rl[$ip] ?? [], fn($t) => $t > $now - 3600));
$rl[$ip][] = $now;
if (count($rl[$ip]) > 20) { http_response_code(429); echo json_encode(['ok' => false, 'message' => 'Rate limit exceeded.']); exit; }
file_put_contents($rlFile, json_encode($rl), LOCK_EX);

// Accept either a URL or pasted content
$inputUrl = trim($_POST['url'] ?? $_GET['url'] ?? '');
$paste = trim($_POST['content'] ?? $_GET['content'] ?? '');

$body = '';
$sourceUrl = '';
if ($paste !== '') {
    $body = $paste;
    $sourceUrl = '(pasted content)';
} else {
    if ($inputUrl === '') { http_response_code(400); echo json_encode(['ok' => false, 'message' => 'Please provide a URL or paste content.']); exit; }
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
        CURLOPT_USERAGENT => 'ExpertinAEO-Answer-Checker/1.0 (+https://expertinaeo.com)',
        CURLOPT_MAXFILESIZE => 2 * 1024 * 1024,
        CURLOPT_PROTOCOLS => CURLPROTO_HTTP | CURLPROTO_HTTPS,
    ]);
    $body = curl_exec($ch);
    $info = curl_getinfo($ch);
    curl_close($ch);
    if ($body === false) { http_response_code(502); echo json_encode(['ok' => false, 'message' => 'Could not fetch URL.']); exit; }
    $sourceUrl = $info['url'] ?? $url;
}

libxml_use_internal_errors(true);
$dom = new DOMDocument();
$dom->loadHTML('<?xml encoding="UTF-8">' . $body, LIBXML_NOWARNING | LIBXML_NOERROR);
$xpath = new DOMXPath($dom);

// First H1
$h1 = '';
foreach ($xpath->query('//h1') as $h) { $h1 = trim($h->textContent); break; }

// First non-empty paragraph (>=40 chars)
$firstPara = '';
foreach ($xpath->query('//body//p') as $p) {
    $t = trim($p->textContent);
    if (mb_strlen($t) >= 40) { $firstPara = $t; break; }
}

// First 3 paragraphs
$paras = [];
foreach ($xpath->query('//body//p') as $p) {
    $t = trim($p->textContent);
    if (mb_strlen($t) >= 40) $paras[] = $t;
    if (count($paras) >= 5) break;
}

$checks = [];

// Direct-answer pattern: 40-300 char first paragraph with sentence-ending punctuation
$len = mb_strlen($firstPara);
$hasEnd = (bool) preg_match('/[.!?]\s/', $firstPara);
$isConcise = ($len >= 40 && $len <= 300);
$checks[] = [
    'name' => 'Direct-answer opening paragraph',
    'status' => ($isConcise && $hasEnd) ? 'pass' : 'warn',
    'detail' => "First paragraph is {$len} chars; " . ($hasEnd ? 'has' : 'no') . ' sentence-ending punctuation. Best practice: 40–300 chars, declarative opening.',
    'priority' => 'high',
];

// First sentence is a complete answer
$firstSentence = '';
if (preg_match('/^([^.!?]{15,200}[.!?])/', $firstPara, $m)) {
    $firstSentence = trim($m[1]);
}
$checks[] = [
    'name' => 'Declarative first sentence',
    'status' => ($firstSentence && mb_strlen($firstSentence) <= 120) ? 'pass' : 'warn',
    'detail' => $firstSentence ? "First sentence: \"{$firstSentence}\"" : 'Could not extract a clean first sentence. Aim for a single declarative answer sentence under 120 chars.',
    'priority' => 'med',
];

// Question-pattern in H1 or H2
$questionFound = false;
$questionH = '';
foreach ($xpath->query('//h1 | //h2') as $h) {
    $t = trim($h->textContent);
    if (preg_match('/^(what|why|how|when|where|who|which|can|do|does|is|are|should|will)\b/i', $t)) {
        $questionFound = true; $questionH = $t; break;
    }
}
$checks[] = [
    'name' => 'Question-pattern heading',
    'status' => $questionFound ? 'pass' : 'warn',
    'detail' => $questionFound ? "Question-pattern heading found: \"{$questionH}\"" : 'No question-pattern H1 or H2 found. Engines often extract answers in response to question queries.',
    'priority' => 'med',
];

// H1 present and unique
$h1Count = $xpath->query('//h1')->length;
$checks[] = [
    'name' => 'Exactly one H1',
    'status' => ($h1Count === 1) ? 'pass' : 'warn',
    'detail' => "Found {$h1Count} H1 tag(s). H1: \"{$h1}\"",
    'priority' => 'med',
];

// FAQ schema
$hasFaqSchema = false;
foreach ($xpath->query("//script[@type='application/ld+json']") as $s) {
    if (strpos($s->textContent, 'FAQPage') !== false) { $hasFaqSchema = true; break; }
}
$checks[] = [
    'name' => 'FAQPage schema',
    'status' => $hasFaqSchema ? 'pass' : 'warn',
    'detail' => $hasFaqSchema ? 'FAQPage schema detected.' : 'No FAQPage schema. Add this to FAQ sections for richer extraction.',
    'priority' => 'med',
];

// Lists and tables (engines love them)
$listCount = $xpath->query('//ul | //ol')->length;
$tableCount = $xpath->query('//table')->length;
$checks[] = [
    'name' => 'Structured lists and tables',
    'status' => ($listCount >= 1 || $tableCount >= 1) ? 'pass' : 'warn',
    'detail' => "{$listCount} list(s), {$tableCount} table(s). Lists and tables are highly extractable for snippet and AI-answer surfaces.",
    'priority' => 'low',
];

// Average words per sentence
$avgWords = 0;
if ($paras) {
    $totalWords = 0; $totalSentences = 0;
    foreach ($paras as $p) {
        $totalWords += str_word_count($p);
        $totalSentences += max(1, preg_match_all('/[.!?]/', $p));
    }
    $avgWords = $totalSentences ? round($totalWords / $totalSentences, 1) : 0;
}
$checks[] = [
    'name' => 'Readability (avg words/sentence)',
    'status' => ($avgWords > 0 && $avgWords <= 22) ? 'pass' : 'warn',
    'detail' => $avgWords > 0 ? "Average {$avgWords} words per sentence. Target ≤22 for extractable answers." : 'Could not measure (insufficient paragraph content).',
    'priority' => 'low',
];

// Score out of 100
$pass = 0; $total = count($checks);
foreach ($checks as $c) {
    if ($c['status'] === 'pass') $pass++;
    elseif ($c['status'] === 'warn') $pass += 0.5;
}
$score = (int) round(($pass / $total) * 100);

echo json_encode([
    'ok' => true,
    'source' => $sourceUrl,
    'fetched_at' => gmdate('c'),
    'score' => $score,
    'h1' => $h1,
    'first_paragraph' => mb_substr($firstPara, 0, 400),
    'first_paragraph_length' => mb_strlen($firstPara),
    'checks' => $checks,
    'disclaimer' => 'Heuristic answer-pattern analysis. Not a guaranteed AI-visibility or ranking score. Pair with content editorial review for production decisions.',
]);
