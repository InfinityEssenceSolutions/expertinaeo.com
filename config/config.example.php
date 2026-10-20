<?php
/**
 * ExpertinAEO — SMTP configuration template
 *
 * PRODUCTION: Copy this file to a NON-public location such as:
 *   /home/<cpanel-user>/expertinaeo-config/smtp.php
 *
 * The /api/contact.php file looks for the config at:
 *   /home/<user>/expertinaeo-config/smtp.php
 * first, then falls back to /public_html/config/config.php (local dev only).
 *
 * Never commit your real credentials. This file is safe to commit.
 */

return [
    'recipient_email' => 'info@tapadiatech.com',
    'from_email'      => 'noreply@expertinaeo.com',
    'from_name'       => 'ExpertinAEO Website',

    // SMTP credentials — REPLACE THESE WITH REAL VALUES IN A NON-PUBLIC COPY
    'smtp_host'        => 'smtp.your-provider.com',
    'smtp_port'        => 587,
    'smtp_user'        => 'your-smtp-username',
    'smtp_pass'        => 'your-smtp-password',
    'smtp_secure'      => 'tls',  // tls | ssl | '' (none)

    // Optional: GA4 Measurement ID (already embedded in HTML)
    'ga4_id'           => 'G-JLTVJKF4CC',
];
