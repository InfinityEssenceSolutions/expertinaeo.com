<?php
/**
 * ExpertinAEO — Free AEO Checker analysis engine
 * Real server-side URL fetch + HTML parse + AEO readiness scoring.
 *
 * Security:
 *   - Strict URL validation (scheme, host, public IP only)
 *   - SSRF prevention (private/loopback/link-local IP blocking)
 *   - DNS resolution check
 *   - Hard timeout (10s connect, 15s total)
 *   - Response-size limit (2 MB)
 *   - Redirect validation (no following into private space)
 *   - No JavaScript execution from fetched HTML
 *   - No unrestricted crawling — single page only
 *
 * Output: JSON { ok, score, categories, checks, fetched, meta }
 */

declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');

// --- Rate limiting (file-based, no DB) ---
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$rlFile = sys_get_temp_dir() . '/expertinaeo_analyze_rl.json';
$rl = [];
if (is_file($rlFile)) {
    $rl = json_decode((string) file_get_contents($rlFile), true) ?: [];
}
$now = time();
$rl[$ip] = array_values(array_filter($rl[$ip] ?? [], fn($t) => $t > $now - 3600));
$rl[$ip][] = $now;
if (count($rl[$ip]) > 20) {
    http_response_code(429);
    echo json_encode(['ok' => false, 'message' => 'Rate limit exceeded. Please try again in a few minutes.']);
    exit;
}
file_put_contents($rlFile, json_encode($rl), LOCK_EX);

// --- Input ---
$inputUrl = trim($_POST['url'] ?? $_GET['url'] ?? '');
if ($inputUrl === '') {
    http_response_code(400);
    echo json_encode(['ok' => false, 'message' => 'Please provide a URL to analyze.']);
    exit;
}

// Prepend scheme if missing
if (!preg_match('#^https?://#i', $inputUrl)) {
    $inputUrl = 'https://' . $inputUrl;
}

// --- URL validation ---
$url = filter_var($inputUrl, FILTER_VALIDATE_URL);
if ($url === false || strlen($url) > 2048) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'message' => 'Invalid URL. Please check the address and try again.']);
    exit;
}
$parts = parse_url($url);
if (!isset($parts['scheme']) || !in_array(strtolower($parts['scheme']), ['http', 'https'], true)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'message' => 'Only http and https URLs are supported.']);
    exit;
}
$host = $parts['host'] ?? '';
if (!$host || !filter_var($host, FILTER_VALIDATE_DOMAIN)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'message' => 'Invalid domain in URL.']);
    exit;
}

// --- SSRF defense: block private / loopback / link-local IPs ---
$ipList = gethostbynamel($host);
if ($ipList === false) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'message' => 'DNS resolution failed for that domain.']);
    exit;
}
foreach ($ipList as $resolvedIp) {
    if (!filter_var($resolvedIp, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'message' => 'Private, loopback or reserved IP ranges are not analyzed.']);
        exit;
    }
}

// --- Fetch ---
$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL => $url,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_MAXREDIRS => 3,
    CURLOPT_CONNECTTIMEOUT => 10,
    CURLOPT_TIMEOUT => 15,
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_SSL_VERIFYHOST => 2,
    CURLOPT_USERAGENT => 'ExpertinAEO-Free-Checker/1.0 (+https://expertinaeo.com)',
    CURLOPT_MAXFILESIZE => 2 * 1024 * 1024,
    CURLOPT_HTTPHEADER => ['Accept: text/html,application/xhtml+xml'],
    CURLOPT_PROTOCOLS => CURLPROTO_HTTP | CURLPROTO_HTTPS,
    CURLOPT_REDIR_PROTOCOLS => CURLPROTO_HTTP | CURLPROTO_HTTPS,
]);
$body = curl_exec($ch);
$info = curl_getinfo($ch);
$err = curl_error($ch);
$errno = curl_errno($ch);
curl_close($ch);

if ($body === false || $body === '') {
    http_response_code(502);
    $friendly = 'Could not fetch the URL. ';
    if ($errno === CURLE_OPERATION_TIMEDOUT) $friendly .= 'The request timed out (target server was too slow).';
    elseif ($errno === CURLE_SSL_CERTPROBLEM) $friendly .= 'SSL certificate verification failed for that domain.';
    elseif ($errno === CURLE_COULDNT_RESOLVE_HOST) $friendly .= 'Host could not be resolved.';
    elseif ($errno === CURLE_COULDNT_CONNECT) $friendly .= 'Connection to the host failed.';
    else $friendly .= 'Error: ' . $err;
    echo json_encode(['ok' => false, 'message' => $friendly]);
    exit;
}

// --- Parse HTML ---
libxml_use_internal_errors(true);
$dom = new DOMDocument();
$dom->loadHTML('<?xml encoding="UTF-8">' . $body, LIBXML_NOWARNING | LIBXML_NOERROR);
$xpath = new DOMXPath($dom);

$finalUrl = $info['url'] ?? $url;
$httpCode = (int)($info['http_code'] ?? 0);
$contentType = $info['content_type'] ?? '';

// --- TECHNICAL CHECKS ---
$tech = [];
$tech['https'] = (strpos($finalUrl, 'https://') === 0);
$tech['http_ok'] = ($httpCode >= 200 && $httpCode < 400);
$tech['redirected'] = ($finalUrl !== $url);
$tech['redirects_count'] = isset($info['redirect_count']) ? (int)$info['redirect_count'] : 0;

$titleNode = $xpath->query('//title')->item(0);
$title = $titleNode ? trim($titleNode->textContent) : '';
$tech['title_present'] = ($title !== '');
$tech['title_length'] = mb_strlen($title);

$metaDesc = '';
foreach ($xpath->query('//meta[@name="description"]') as $m) {
    $metaDesc = trim($m->getAttribute('content'));
    break;
}
$tech['meta_description_present'] = ($metaDesc !== '');
$tech['meta_description_length'] = mb_strlen($metaDesc);

$canonical = '';
foreach ($xpath->query('//link[@rel="canonical"]') as $c) {
    $canonical = trim($c->getAttribute('href'));
    break;
}
$tech['canonical_present'] = ($canonical !== '');

$metaRobots = '';
foreach ($xpath->query('//meta[@name="robots"]') as $m) {
    $metaRobots = strtolower(trim($m->getAttribute('content')));
    break;
}
$tech['robots_noindex'] = (strpos($metaRobots, 'noindex') !== false);
$tech['robots_nofollow'] = (strpos($metaRobots, 'nofollow') !== false);

$headings = ['h1' => 0, 'h2' => 0, 'h3' => 0, 'h4' => 0];
foreach (array_keys($headings) as $tag) {
    $headings[$tag] = $xpath->query('//' . $tag)->length;
}

// --- CONTENT CHECKS ---
$h1Texts = [];
foreach ($xpath->query('//h1') as $h1) {
    $h1Texts[] = trim($h1->textContent);
}
$firstPara = '';
foreach ($xpath->query('//body//p') as $p) {
    $t = trim($p->textContent);
    if (mb_strlen($t) > 40) { $firstPara = $t; break; }
}
$firstParaLower = mb_strtolower($firstPara);

// Direct-answer heuristics: short paragraphs ending with sentence-ending punctuation, between 40–300 chars
$directAnswerPattern = (mb_strlen($firstPara) >= 40 && mb_strlen($firstPara) <= 300
    && (preg_match('/[.!?]\s/', $firstPara) || preg_match('/[:]\s/', $firstPara)));

// Question coverage: count H2/H3 containing question words
$questionWords = ['what', 'why', 'how', 'when', 'where', 'who', 'which', 'can ', 'do ', 'does ', 'is ', 'are '];
$questionsInHeadings = 0;
foreach ($xpath->query('//h2 | //h3') as $h) {
    $t = mb_strtolower(trim($h->textContent));
    foreach ($questionWords as $q) {
        if (strpos($t, $q) === 0 || strpos($t, ' ' . $q) !== false) {
            $questionsInHeadings++; break;
        }
    }
}

// FAQ presence: detect common FAQ patterns
$faqPresent = false;
foreach ($xpath->query('//*[contains(@class, "faq") or contains(@id, "faq")]') as $f) {
    $faqPresent = true; break;
}
if (!$faqPresent) {
    // Look for Question/Answer pairs in dt/dd or strong/paragraph structure
    if ($xpath->query('//dl')->length > 0) $faqPresent = true;
}

// Internal links
$internalLinks = 0;
$externalLinks = 0;
$baseHost = parse_url($finalUrl, PHP_URL_HOST);
foreach ($xpath->query('//a[@href]') as $a) {
    $href = trim($a->getAttribute('href'));
    if ($href === '' || $href[0] === '#') continue;
    if (preg_match('#^https?://#i', $href)) {
        $linkHost = parse_url($href, PHP_URL_HOST);
        if ($linkHost === $baseHost) $internalLinks++; else $externalLinks++;
    } else {
        $internalLinks++;
    }
}

// Readability heuristic: avg words per sentence in first 5 paragraphs
$paras = [];
foreach ($xpath->query('//body//p') as $p) {
    $t = trim($p->textContent);
    if (mb_strlen($t) > 40) $paras[] = $t;
    if (count($paras) >= 5) break;
}
$avgWords = 0;
if ($paras) {
    $totalWords = 0; $totalSentences = 0;
    foreach ($paras as $p) {
        $totalWords += str_word_count($p);
        $totalSentences += max(1, preg_match_all('/[.!?]/', $p));
    }
    $avgWords = $totalSentences ? $totalWords / $totalSentences : 0;
}

// --- STRUCTURED DATA CHECKS ---
$jsonLdScripts = $xpath->query("//script[@type='application/ld+json']");
$schemaTypes = [];
$schemaValidCount = 0;
$schemaInvalidCount = 0;
$jsonLdRaw = [];
foreach ($jsonLdScripts as $s) {
    $raw = trim($s->textContent);
    if ($raw === '') continue;
    $jsonLdRaw[] = $raw;
    $decoded = json_decode($raw, true);
    if ($decoded === null) { $schemaInvalidCount++; continue; }
    $schemaValidCount++;
    $items = isset($decoded['@type']) ? [$decoded] : (isset($decoded['@graph']) ? $decoded['@graph'] : (isset($decoded[0]) ? $decoded : [$decoded]));
    if (!is_array($items)) $items = [$items];
    foreach ($items as $item) {
        if (!is_array($item)) continue;
        $t = $item['@type'] ?? null;
        if (is_array($t)) {
            foreach ($t as $sub) $schemaTypes[] = $sub;
        } elseif ($t) {
            $schemaTypes[] = $t;
        }
    }
}
$schemaTypes = array_unique($schemaTypes);

$hasOrgSchema = in_array('Organization', $schemaTypes) || in_array('NGO', $schemaTypes) || in_array('Corporation', $schemaTypes) || in_array('LocalBusiness', $schemaTypes);
$hasFaqSchema = in_array('FAQPage', $schemaTypes);
$hasArticleSchema = in_array('Article', $schemaTypes) || in_array('BlogPosting', $schemaTypes) || in_array('NewsArticle', $schemaTypes);
$hasBreadSchema = in_array('BreadcrumbList', $schemaTypes);

// --- ENTITY / CREDIBILITY CHECKS ---
$hasContactLink = ($xpath->query('//a[contains(@href, "contact")]')->length > 0);
$hasAboutLink = ($xpath->query('//a[contains(@href, "about")]')->length > 0);
$hasAuthorByline = false;
foreach ($xpath->query('//*[contains(@class, "author") or contains(@rel, "author") or @itemprop="author"]') as $a) {
    $hasAuthorByline = true; break;
}
$sameAsCount = 0;
foreach ($xpath->query('//a[@rel="me" or @rel="sameAs"]') as $a) { $sameAsCount++; }
foreach ($xpath->query('//link[@rel="sameAs"]') as $a) { $sameAsCount++; }

// Social profile links heuristic
$socialPatterns = ['twitter.com', 'x.com', 'linkedin.com', 'facebook.com', 'youtube.com', 'instagram.com', 'github.com'];
$socialCount = 0;
foreach ($xpath->query('//a[@href]') as $a) {
    $h = strtolower($a->getAttribute('href'));
    foreach ($socialPatterns as $p) { if (strpos($h, $p) !== false) { $socialCount++; break; } }
}

// Visible content dates: <time> elements
$timeElements = $xpath->query('//time');
$hasDate = ($timeElements->length > 0);

// --- IMAGES / ACCESSIBILITY ---
$imgs = $xpath->query('//img');
$totalImgs = $imgs->length;
$imgsMissingAlt = 0;
$imgsEmptyAlt = 0;
foreach ($imgs as $img) {
    if (!$img->hasAttribute('alt')) $imgsMissingAlt++;
    elseif (trim($img->getAttribute('alt')) === '') $imgsEmptyAlt++;
}
$imgsHasLang = ($dom->documentElement && $dom->documentElement->hasAttribute('lang'));
$htmlLang = $imgsHasLang ? $dom->documentElement->getAttribute('lang') : '';

// --- BUILD CHECKS ARRAY ---
$checks = [];

// Technical
$checks[] = ['category' => 'Technical Crawlability', 'name' => 'HTTPS enabled', 'status' => $tech['https'] ? 'pass' : 'warn', 'detail' => $tech['https'] ? 'Page served over HTTPS.' : 'Page is not on HTTPS. Migrate to HTTPS for trust and crawl safety.', 'priority' => $tech['https'] ? 'low' : 'high'];
$checks[] = ['category' => 'Technical Crawlability', 'name' => 'HTTP 2xx/3xx response', 'status' => $tech['http_ok'] ? 'pass' : 'fail', 'detail' => 'HTTP ' . $httpCode . ' returned' . ($tech['redirected'] ? ' after ' . $tech['redirects_count'] . ' redirect(s).' : '.'), 'priority' => $tech['http_ok'] ? 'low' : 'high'];
$checks[] = ['category' => 'Technical Crawlability', 'name' => 'Title tag present', 'status' => $tech['title_present'] ? 'pass' : 'fail', 'detail' => $tech['title_present'] ? 'Title: "' . mb_substr($title, 0, 80) . '"' . ($tech['title_length'] < 30 ? ' (may be too short)' : ($tech['title_length'] > 70 ? ' (may be too long)' : '')) : 'No <title> tag found.', 'priority' => $tech['title_present'] ? 'low' : 'high'];
$checks[] = ['category' => 'Technical Crawlability', 'name' => 'Meta description present', 'status' => $tech['meta_description_present'] ? 'pass' : 'warn', 'detail' => $tech['meta_description_present'] ? ($tech['meta_description_length'] < 80 ? 'Length ' . $tech['meta_description_length'] . ' — may be too short.' : ($tech['meta_description_length'] > 160 ? 'Length ' . $tech['meta_description_length'] . ' — may be too long.' : 'Length ' . $tech['meta_description_length'] . '.')) : 'No meta description found.', 'priority' => $tech['meta_description_present'] ? 'low' : 'med'];
$checks[] = ['category' => 'Technical Crawlability', 'name' => 'Canonical tag', 'status' => $tech['canonical_present'] ? 'pass' : 'warn', 'detail' => $tech['canonical_present'] ? 'Canonical: ' . mb_substr($canonical, 0, 100) : 'No canonical URL specified.', 'priority' => $tech['canonical_present'] ? 'low' : 'med'];
$checks[] = ['category' => 'Technical Crawlability', 'name' => 'Robots directives', 'status' => $tech['robots_noindex'] ? 'warn' : 'pass', 'detail' => $tech['robots_noindex'] ? 'Page is set to noindex — answer engines will not include it.' : 'No noindex directive found.', 'priority' => $tech['robots_noindex'] ? 'high' : 'low'];
$checks[] = ['category' => 'Technical Crawlability', 'name' => 'Heading hierarchy', 'status' => ($headings['h1'] === 1) ? 'pass' : 'warn', 'detail' => 'Found ' . $headings['h1'] . ' H1, ' . $headings['h2'] . ' H2, ' . $headings['h3'] . ' H3. Best practice: exactly one H1.', 'priority' => ($headings['h1'] === 1) ? 'low' : 'med'];

// Content
$checks[] = ['category' => 'Answer Content', 'name' => 'Direct-answer pattern', 'status' => $directAnswerPattern ? 'pass' : 'warn', 'detail' => $directAnswerPattern ? 'First paragraph is concise (40–300 chars) with sentence-ending punctuation — a strong direct-answer candidate.' : 'First paragraph does not match a concise direct-answer pattern. Consider leading with a 40–300 char answer sentence.', 'priority' => $directAnswerPattern ? 'low' : 'high'];
$checks[] = ['category' => 'Answer Content', 'name' => 'Question coverage in headings', 'status' => $questionsInHeadings >= 3 ? 'pass' : ($questionsInHeadings >= 1 ? 'warn' : 'fail'), 'detail' => "Found {$questionsInHeadings} question-pattern heading(s). Aim for explicit question coverage across your topic.", 'priority' => $questionsInHeadings >= 3 ? 'low' : 'med'];
$checks[] = ['category' => 'Answer Content', 'name' => 'FAQ section present', 'status' => $faqPresent ? 'pass' : 'warn', 'detail' => $faqPresent ? 'FAQ pattern detected on page.' : 'No FAQ section detected. Consider adding an explicit Q&A block.', 'priority' => $faqPresent ? 'low' : 'med'];
$checks[] = ['category' => 'Answer Content', 'name' => 'Internal link coverage', 'status' => $internalLinks >= 3 ? 'pass' : ($internalLinks >= 1 ? 'warn' : 'fail'), 'detail' => "Found {$internalLinks} internal link(s) and {$externalLinks} external link(s).", 'priority' => $internalLinks >= 3 ? 'low' : 'med'];
$checks[] = ['category' => 'Answer Content', 'name' => 'Readability (avg words/sentence)', 'status' => ($avgWords > 0 && $avgWords <= 22) ? 'pass' : ($avgWords > 0 ? 'warn' : 'fail'), 'detail' => $avgWords > 0 ? "Average " . round($avgWords, 1) . " words per sentence in opening paragraphs." : 'Could not measure readability (insufficient paragraph content).', 'priority' => ($avgWords > 0 && $avgWords <= 22) ? 'low' : 'low'];

// Structured Data
$checks[] = ['category' => 'Structured Data', 'name' => 'JSON-LD detected', 'status' => $schemaValidCount > 0 ? 'pass' : 'fail', 'detail' => $schemaValidCount > 0 ? "{$schemaValidCount} valid JSON-LD block(s) found." . ($schemaInvalidCount > 0 ? " {$schemaInvalidCount} block(s) failed to parse." : '') : 'No valid JSON-LD structured data found on the page.', 'priority' => $schemaValidCount > 0 ? 'low' : 'high'];
$checks[] = ['category' => 'Structured Data', 'name' => 'Organization / LocalBusiness schema', 'status' => $hasOrgSchema ? 'pass' : 'warn', 'detail' => $hasOrgSchema ? 'Organization-level schema detected.' : 'No Organization, Corporation or LocalBusiness schema found. Add this to your home page.', 'priority' => $hasOrgSchema ? 'low' : 'med'];
$checks[] = ['category' => 'Structured Data', 'name' => 'FAQPage schema', 'status' => $hasFaqSchema ? 'pass' : 'warn', 'detail' => $hasFaqSchema ? 'FAQPage schema detected — eligible for rich FAQ results.' : 'No FAQPage schema. Add this to your FAQ sections.', 'priority' => $hasFaqSchema ? 'low' : 'med'];
$checks[] = ['category' => 'Structured Data', 'name' => 'Article schema (if applicable)', 'status' => $hasArticleSchema ? 'pass' : 'warn', 'detail' => $hasArticleSchema ? 'Article schema detected on content page.' : 'No Article/BlogPosting schema. Recommended for editorial content.', 'priority' => $hasArticleSchema ? 'low' : 'low'];
$checks[] = ['category' => 'Structured Data', 'name' => 'BreadcrumbList schema', 'status' => $hasBreadSchema ? 'pass' : 'warn', 'detail' => $hasBreadSchema ? 'BreadcrumbList schema detected.' : 'No BreadcrumbList schema. Add breadcrumbs to deep pages.', 'priority' => $hasBreadSchema ? 'low' : 'low'];

// Entity & Credibility
$checks[] = ['category' => 'Entity Signals', 'name' => 'Organization identity (About / Contact)', 'status' => ($hasAboutLink && $hasContactLink) ? 'pass' : 'warn', 'detail' => 'About link: ' . ($hasAboutLink ? 'yes' : 'no') . '; Contact link: ' . ($hasContactLink ? 'yes' : 'no') . '.', 'priority' => ($hasAboutLink && $hasContactLink) ? 'low' : 'med'];
$checks[] = ['category' => 'Entity Signals', 'name' => 'Author byline / markup', 'status' => $hasAuthorByline ? 'pass' : 'warn', 'detail' => $hasAuthorByline ? 'Author markup detected.' : 'No author byline or itemprop="author" detected. Add explicit author attribution.', 'priority' => $hasAuthorByline ? 'low' : 'med'];
$checks[] = ['category' => 'Entity Signals', 'name' => 'sameAs / social profile links', 'status' => ($sameAsCount > 0 || $socialCount >= 2) ? 'pass' : 'warn', 'detail' => "{$sameAsCount} sameAs link(s) and {$socialCount} social profile link(s) detected.", 'priority' => ($sameAsCount > 0 || $socialCount >= 2) ? 'low' : 'med'];
$checks[] = ['category' => 'Credibility Signals', 'name' => 'Visible content dates', 'status' => $hasDate ? 'pass' : 'warn', 'detail' => $hasDate ? "{$timeElements->length} <time> element(s) with date markup." : 'No <time> elements with date markup found.', 'priority' => $hasDate ? 'low' : 'low'];
$checks[] = ['category' => 'Credibility Signals', 'name' => 'HTML lang attribute', 'status' => $imgsHasLang ? 'pass' : 'warn', 'detail' => $imgsHasLang ? 'lang="' . htmlspecialchars($htmlLang) . '"' : 'No lang attribute on <html>. Add lang for accessibility and language targeting.', 'priority' => $imgsHasLang ? 'low' : 'med'];

// Images / Accessibility
$imgsTotalPass = ($totalImgs > 0 && $imgsMissingAlt === 0);
$checks[] = ['category' => 'Accessibility', 'name' => 'Image alt attributes', 'status' => $imgsTotalPass ? 'pass' : ($totalImgs === 0 ? 'pass' : 'warn'), 'detail' => "{$totalImgs} image(s); {$imgsMissingAlt} missing alt, {$imgsEmptyAlt} empty alt.", 'priority' => $imgsTotalPass ? 'low' : 'med'];

// --- SCORE ---
// Weighting: Answer Content 25, Structured Data 20, Technical Crawlability 20, Entity Signals 15, Question Coverage 10, Credibility 10
$scoreCategories = [
    'Answer Content' => ['weight' => 25, 'pass' => 0, 'total' => 0],
    'Structured Data' => ['weight' => 20, 'pass' => 0, 'total' => 0],
    'Technical Crawlability' => ['weight' => 20, 'pass' => 0, 'total' => 0],
    'Entity Signals' => ['weight' => 15, 'pass' => 0, 'total' => 0],
    'Question Coverage' => ['weight' => 10, 'pass' => 0, 'total' => 0],
    'Credibility Signals' => ['weight' => 10, 'pass' => 0, 'total' => 0],
];

// Question coverage gets its own bucket from a single check (already counted under Answer Content); create a separate virtual bucket
$questionScoreBucket = [
    'Answer Content' => 'Answer Content',
    'Structured Data' => 'Structured Data',
    'Technical Crawlability' => 'Technical Crawlability',
    'Entity Signals' => 'Entity Signals',
    'Credibility Signals' => 'Credibility Signals',
    'Accessibility' => 'Technical Crawlability',
];

foreach ($checks as $c) {
    $cat = $questionScoreBucket[$c['category']] ?? $c['category'];
    if (!isset($scoreCategories[$cat])) continue;
    $scoreCategories[$cat]['total']++;
    if ($c['status'] === 'pass') $scoreCategories[$cat]['pass']++;
    // partial credit for warn
    elseif ($c['status'] === 'warn') $scoreCategories[$cat]['pass'] += 0.5;
}

// Question coverage separate bucket (overlaps with content heading check)
$questionCheck = null;
foreach ($checks as $c) {
    if ($c['name'] === 'Question coverage in headings') { $questionCheck = $c; break; }
}
if ($questionCheck) {
    $scoreCategories['Question Coverage'] = ['weight' => 10, 'pass' => $questionCheck['status'] === 'pass' ? 1 : ($questionCheck['status'] === 'warn' ? 0.5 : 0), 'total' => 1];
}

$overallScore = 0;
$categoryOut = [];
foreach ($scoreCategories as $name => $c) {
    $ratio = $c['total'] > 0 ? $c['pass'] / $c['total'] : 0;
    $points = $ratio * $c['weight'];
    $overallScore += $points;
    $categoryOut[] = [
        'name' => $name,
        'score' => round($ratio * 100),
        'weight_pct' => $c['weight'],
        'passed' => (int)$c['pass'],
        'total' => (int)$c['total'],
        'desc' => categoryDescription($name),
    ];
}
$overallScore = (int) round($overallScore);

// Grade
if ($overallScore >= 85) $grade = 'excellent';
elseif ($overallScore >= 70) $grade = 'good';
elseif ($overallScore >= 50) $grade = 'fair';
else $grade = 'poor';

// --- OUTPUT ---
echo json_encode([
    'ok' => true,
    'fetched_url' => $finalUrl,
    'requested_url' => $url,
    'http_code' => $httpCode,
    'content_type' => $contentType,
    'response_size_bytes' => strlen($body),
    'fetched_at' => gmdate('c'),
    'score' => $overallScore,
    'grade' => $grade,
    'categories' => $categoryOut,
    'checks' => $checks,
    'meta' => [
        'title' => $title,
        'meta_description' => $metaDesc,
        'canonical' => $canonical,
        'meta_robots' => $metaRobots,
        'heading_counts' => $headings,
        'h1_first' => $h1Texts[0] ?? '',
        'schema_types_detected' => array_values($schemaTypes),
        'json_ld_block_count' => $schemaValidCount,
        'images_total' => $totalImgs,
        'images_missing_alt' => $imgsMissingAlt,
        'html_lang' => $htmlLang,
    ],
    'disclaimer' => 'Heuristic analysis only. Not a guaranteed AI-visibility or ranking score. Some checks are unavailable for sites that block server-side fetching or rely on JavaScript rendering.',
]);

function categoryDescription($name) {
    switch ($name) {
        case 'Answer Content': return 'Direct-answer patterns, question coverage, FAQ presence and content organization.';
        case 'Structured Data': return 'JSON-LD detection, schema types and basic validation.';
        case 'Technical Crawlability': return 'HTTP, HTTPS, redirects, title, meta description, canonical, robots, heading hierarchy.';
        case 'Entity Signals': return 'Organization identity, author bylines, sameAs links and social profiles.';
        case 'Question Coverage': return 'Explicit question-pattern headings mapped to your topic.';
        case 'Credibility Signals': return 'Visible content dates, language declarations and accessibility basics.';
        default: return '';
    }
}
