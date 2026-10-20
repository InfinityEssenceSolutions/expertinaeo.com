<?php
/**
 * ExpertinAEO — Lead / contact form handler
 *
 * - Server-side validation
 * - CSRF protection (session token)
 * - Honeypot (company_url field)
 * - Rate limiting (file-based)
 * - Secure authenticated SMTP via PHPMailer (or PHP mail() fallback)
 * - Reply-To = submitter email (validated)
 * - Subject: "Feedback form from expertinaeo.com"
 * - Recipient: info@tapadiatech.com
 * - GA4-friendly JSON response (no PII in events — handled client-side)
 *
 * SMTP credentials live OUTSIDE public_html in production:
 *   /home/<user>/expertinaeo-config/smtp.php
 *
 * During local dev, copy /public_html/config/config.example.php to
 * /public_html/config/config.php and edit. The example file is safe to commit.
 */

declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');

// --- Bootstrap session for CSRF ---
session_start();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'message' => 'Method not allowed.']);
    exit;
}

// --- Rate limit (per IP, 5 per hour) ---
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$rlFile = sys_get_temp_dir() . '/expertinaeo_contact_rl.json';
$rl = [];
if (is_file($rlFile)) {
    $rl = json_decode((string) file_get_contents($rlFile), true) ?: [];
}
$now = time();
$rl[$ip] = array_values(array_filter($rl[$ip] ?? [], fn($t) => $t > $now - 3600));
$rl[$ip][] = $now;
if (count($rl[$ip]) > 5) {
    http_response_code(429);
    echo json_encode(['ok' => false, 'message' => 'Too many submissions from this IP. Please try again later or email us directly.']);
    exit;
}
file_put_contents($rlFile, json_encode($rl), LOCK_EX);

// --- Honeypot ---
$honeypot = trim($_POST['company_url'] ?? '');
if ($honeypot !== '') {
    // Silently accept but discard — bots shouldn't get a clue
    echo json_encode(['ok' => true, 'message' => 'Thank you. We will be in touch shortly.', 'discarded' => true]);
    exit;
}

// --- Helper: input ---
function val(string $key, bool $required = false, int $maxLen = 4000): string {
    $v = trim($_POST[$key] ?? '');
    if ($required && $v === '') {
        throw new RuntimeException("Field '{$key}' is required.");
    }
    return substr($v, 0, $maxLen);
}

// --- Validate ---
$errors = [];
try { $fullName = val('full_name', true, 120); } catch (RuntimeException $e) { $errors[] = $e->getMessage(); }
try { $email = val('email', true, 200); } catch (RuntimeException $e) { $errors[] = $e->getMessage(); }
try { $company = val('company', true, 200); } catch (RuntimeException $e) { $errors[] = $e->getMessage(); }
$website = val('website', false, 500);
$country = val('country', true, 100);
$serviceInterest = val('service_interest', false, 200);
$phoneWhats = val('phone', false, 60);
$industry = val('industry', false, 120);
$budget = val('budget', false, 120);
$timeline = val('timeline', false, 120);
$competitors = val('competitors', false, 1000);
try { $challenge = val('challenge', true, 5000); } catch (RuntimeException $e) { $errors[] = $e->getMessage(); }
$projectDesc = val('project_description', false, 5000);
$sourceForm = val('source_form', false, 60);
$sourceUrl = val('source_url', false, 1000);
$utmSource = val('utm_source', false, 200);
$utmMedium = val('utm_medium', false, 200);
$utmCampaign = val('utm_campaign', false, 200);
$privacyConsent = isset($_POST['privacy_consent']) && $_POST['privacy_consent'] === 'on';
if (!$privacyConsent) $errors[] = 'Privacy consent is required.';

// Email format
if ($email && !filter_var($email, FILTER_VALIDATE_EMAIL)) $errors[] = 'A valid business email is required.';
// Phone (optional) - basic digits+symbols
if ($phoneWhats && !preg_match('/^[+0-9 ()\-]{6,30}$/', $phoneWhats)) $errors[] = 'Phone number format is invalid.';
// Website validation (allow "No Website Yet")
if ($website !== '' && stripos($website, 'No Website Yet') === false) {
    if (!filter_var($website, FILTER_VALIDATE_URL) && !preg_match('#^https?://#i', $website)) {
        $errors[] = 'Website URL is invalid. Use https:// or "No Website Yet".';
    }
}

if (!empty($errors)) {
    http_response_code(422);
    echo json_encode(['ok' => false, 'message' => 'Please fix: ' . implode(' ', $errors), 'errors' => $errors]);
    exit;
}

// --- CSRF token (loose check: if a token is posted, verify it; if not, allow first request)
// (We accept first-time POSTs because the form is on static HTML; session token is added when JS supports it.)
$csrf = $_POST['csrf_token'] ?? '';
if (isset($_SESSION['expertinaeo_csrf']) && $csrf !== '' && !hash_equals($_SESSION['expertinaeo_csrf'], $csrf)) {
    http_response_code(403);
    echo json_encode(['ok' => false, 'message' => 'Security token mismatch. Please refresh and try again.']);
    exit;
}
// Always rotate the token
$_SESSION['expertinaeo_csrf'] = bin2hex(random_bytes(16));

// --- Load SMTP config (outside public_html in prod) ---
$prodConfig = '/home/' . get_current_user() . '/expertinaeo-config/smtp.php';
$localConfig = __DIR__ . '/../config/config.php';
$config = null;
if (is_file($prodConfig)) {
    $config = include $prodConfig;
} elseif (is_file($localConfig)) {
    $config = include $localConfig;
}

// --- Build email ---
$subject = 'Feedback form from expertinaeo.com';
$toEmail = $config['recipient_email'] ?? 'info@tapadiatech.com';

$bodyLines = [];
$bodyLines[] = 'A new enquiry was submitted via expertinaeo.com.';
$bodyLines[] = '';
$bodyLines[] = '--- Contact details ---';
$bodyLines[] = "Name: {$fullName}";
$bodyLines[] = "Email: {$email}";
if ($phoneWhats) $bodyLines[] = "Phone / WhatsApp: {$phoneWhats}";
$bodyLines[] = "Company: {$company}";
$websiteDisplay = $website ?: '(none provided)';
$bodyLines[] = "Website: {$websiteDisplay}";
$bodyLines[] = "Country: {$country}";
if ($industry) $bodyLines[] = "Industry: {$industry}";
$bodyLines[] = '';
$bodyLines[] = '--- Enquiry ---';
if ($serviceInterest) $bodyLines[] = "Service interest: {$serviceInterest}";
if ($budget) $bodyLines[] = "Monthly budget: {$budget}";
if ($timeline) $bodyLines[] = "Project timeline: {$timeline}";
if ($competitors) $bodyLines[] = "Competitor URLs: {$competitors}";
$bodyLines[] = '';
$bodyLines[] = "Main business challenge:";
$bodyLines[] = $challenge;
if ($projectDesc) {
    $bodyLines[] = '';
    $bodyLines[] = "Project description:";
    $bodyLines[] = $projectDesc;
}
$bodyLines[] = '';
$bodyLines[] = '--- Submission metadata ---';
$bodyLines[] = "Source form: {$sourceForm}";
$bodyLines[] = "Source URL: {$sourceUrl}";
$bodyLines[] = "IP: {$ip}";
$bodyLines[] = "User-Agent: " . substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 300);
if ($utmSource) $bodyLines[] = "utm_source: {$utmSource}";
if ($utmMedium) $bodyLines[] = "utm_medium: {$utmMedium}";
if ($utmCampaign) $bodyLines[] = "utm_campaign: {$utmCampaign}";
$bodyLines[] = "Submitted at (UTC): " . gmdate('Y-m-d H:i:s');
$bodyLines[] = "Privacy consent: " . ($privacyConsent ? 'yes' : 'no');

$body = implode("\r\n", $bodyLines);

// --- Send mail ---
$sent = false;
$mailerError = '';

if ($config && !empty($config['smtp_host'])) {
    // Try PHPMailer if available
    $phpmailerPath = __DIR__ . '/../vendor/phpmailer/phpmailer/src/PHPMailer.php';
    if (is_file($phpmailerPath)) {
        require_once $phpmailerPath;
        require_once __DIR__ . '/../vendor/phpmailer/phpmailer/src/SMTP.php';
        require_once __DIR__ . '/../vendor/phpmailer/phpmailer/src/Exception.php';

        $mail = new PHPMailer\PHPMailer\PHPMailer(true);
        try {
            $mail->isSMTP();
            $mail->Host = $config['smtp_host'];
            $mail->Port = (int)($config['smtp_port'] ?? 587);
            $mail->SMTPAuth = true;
            $mail->Username = $config['smtp_user'];
            $mail->Password = $config['smtp_pass'];
            $mail->SMTPSecure = $config['smtp_secure'] ?? 'tls';
            $mail->CharSet = 'UTF-8';
            $mail->setFrom($config['from_email'], $config['from_name'] ?? 'ExpertinAEO Website');
            $mail->addReplyTo($email, $fullName);
            $mail->addAddress($toEmail);
            $mail->Subject = $subject;
            $mail->Body = $body;
            $mail->send();
            $sent = true;
        } catch (Exception $e) {
            $mailerError = $e->getMessage();
        }
    }
}

if (!$sent) {
    // Fallback to PHP mail()
    $headers = [
        'From: ' . ($config['from_email'] ?? 'noreply@' . ($_SERVER['HTTP_HOST'] ?? 'expertinaeo.com')),
        'Reply-To: ' . $email,
        'X-Mailer: PHP/' . phpversion(),
        'Content-Type: text/plain; charset=UTF-8',
    ];
    $sent = @mail($toEmail, $subject, $body, implode("\r\n", $headers));
    if (!$sent) $mailerError = 'mail() function returned false';
}

// --- Persist to file (fallback log; not a substitute for email) ---
$logDir = sys_get_temp_dir();
$logEntry = '[' . gmdate('c') . '] ' . $fullName . ' <' . $email . '> [' . $sourceForm . "]\n";
file_put_contents($logDir . '/expertinaeo_leads.log', $logEntry, FILE_APPEND | LOCK_EX);

if ($sent) {
    echo json_encode([
        'ok' => true,
        'message' => 'Thank you. Your enquiry has been received — we will respond within one business day.',
    ]);
} else {
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'message' => 'We could not deliver your message automatically. Please email us directly at info@tapadiatech.com or message us on WhatsApp +1-213-258-1582.',
        'debug' => $mailerError,
    ]);
}
