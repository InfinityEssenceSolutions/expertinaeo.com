<?php
/**
 * ExpertinAEO — FAQ Generator
 * Produces question suggestions from a supplied topic using deterministic rules.
 *
 * We do NOT claim AI generation without an AI model. This tool generates
 * question patterns from the topic using:
 *   - Question templates (what, why, how, when, where, who, which)
 *   - Topic-derived nouns and modifiers
 *   - Common commercial intent patterns
 *   - Industry-standard PAA question stems
 */
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');

$topic = trim($_POST['topic'] ?? $_GET['topic'] ?? '');
$audience = trim($_POST['audience'] ?? $_GET['audience'] ?? 'general'); // general | b2b | consumer | technical
if ($topic === '' || mb_strlen($topic) < 2) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'message' => 'Please provide a topic.']);
    exit;
}
if (mb_strlen($topic) > 200) $topic = mb_substr($topic, 0, 200);

// Strip filler
$topicClean = preg_replace('/\s+/', ' ', $topic);
$topicLower = mb_strtolower($topicClean);
$topicTitle = mb_convert_case($topicClean, MB_CASE_TITLE, 'UTF-8');

// Question stems — derived from analysis of common PAA and AI-answer patterns
$stems = [
    'what' => [
        "What is {topic}?",
        "What does {topic} mean?",
        "What are the benefits of {topic}?",
        "What are the types of {topic}?",
        "What should I know about {topic}?",
    ],
    'why' => [
        "Why is {topic} important?",
        "Why does {topic} matter?",
        "Why should businesses invest in {topic}?",
    ],
    'how' => [
        "How does {topic} work?",
        "How to get started with {topic}?",
        "How much does {topic} cost?",
        "How long does {topic} take?",
        "How to measure {topic} success?",
        "How to choose a {topic} provider?",
    ],
    'when' => [
        "When should you start {topic}?",
        "When is {topic} the right choice?",
    ],
    'who' => [
        "Who needs {topic}?",
        "Who should manage {topic}?",
    ],
    'comparison' => [
        "{topic} vs alternatives — what's the difference?",
        "What's the difference between {topic} and similar approaches?",
    ],
    'best' => [
        "What are the best practices for {topic}?",
        "What makes a good {topic} strategy?",
    ],
    'common' => [
        "What are common mistakes in {topic}?",
        "What are the challenges of {topic}?",
        "What are the alternatives to {topic}?",
    ],
];

// Audience-specific additions
if ($audience === 'b2b') {
    $stems['b2b'] = [
        "How does {topic} impact ROI?",
        "How to evaluate {topic} vendors?",
        "What's the business case for {topic}?",
        "How to build a {topic} business case?",
        "What's the typical {topic} engagement model?",
    ];
} elseif ($audience === 'consumer') {
    $stems['consumer'] = [
        "Is {topic} worth it?",
        "How to know if {topic} is right for me?",
        "What to look for in {topic}?",
    ];
} elseif ($audience === 'technical') {
    $stems['technical'] = [
        "What's the technical architecture of {topic}?",
        "How to implement {topic}?",
        "What are the technical requirements for {topic}?",
        "How to debug {topic} issues?",
    ];
}

// Build the question list, substituting {topic}
$questions = [];
foreach ($stems as $group => $list) {
    foreach ($list as $q) {
        $questions[] = [
            'group' => $group,
            'question' => str_replace(['{topic}'], $topicTitle, $q),
        ];
    }
}

// Remove exact duplicates
$seen = [];
$unique = [];
foreach ($questions as $q) {
    if (in_array($q['question'], $seen, true)) continue;
    $seen[] = $q['question'];
    $unique[] = $q;
}

// Generate FAQPage JSON-LD template (8 questions, ready to copy)
$schemaQuestions = array_slice($unique, 0, 8);
$jsonLd = [
    '@context' => 'https://schema.org',
    '@type' => 'FAQPage',
    'mainEntity' => array_map(function ($q) {
        return [
            '@type' => 'Question',
            'name' => $q['question'],
            'acceptedAnswer' => [
                '@type' => 'Answer',
                'text' => '[Your answer here — keep it 40–80 words, declarative, in the first sentence.]',
            ],
        ];
    }, $schemaQuestions),
];

echo json_encode([
    'ok' => true,
    'topic' => $topicClean,
    'audience' => $audience,
    'question_count' => count($unique),
    'questions' => $unique,
    'faqpage_jsonld' => json_encode($jsonLd, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES),
    'method' => 'Deterministic question-pattern generation from topic analysis. NOT AI generation. We use question stems derived from PAA and AI-answer pattern analysis.',
    'disclaimer' => 'Question suggestions are heuristics. Always review for relevance, intent match and answerability before publishing. Pair with intent research for production decisions.',
]);
