<?php
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$isLocalOrigin = (bool)preg_match(
    '#^https?://(localhost|127\.0\.0\.1)(:\d+)?$#i',
    $origin
);
if ($isLocalOrigin) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
}
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function respond(array $data, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function readJson(): array
{
    $data = json_decode(file_get_contents('php://input'), true);

    if (!is_array($data)) {
        respond(['error' => 'Invalid JSON request'], 400);
    }

    return $data;
}

function adminResponse(array $data, int $status = 200): never
{
    respond($data, $status);
}

function requireAdmin(): void
{
    if (session_status() !== PHP_SESSION_ACTIVE) {
        session_start();
    }
    if (
        empty($_SESSION['user_id']) ||
        !in_array($_SESSION['role'] ?? '', ['admin', 'Admin'], true)
    ) {
        adminResponse([
            'success' => false,
            'error' => 'Administrator login required.'
        ], 401);
    }
}
