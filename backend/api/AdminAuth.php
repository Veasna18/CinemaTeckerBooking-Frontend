<?php
// declare(strict_types=1);

// AdminAuth is called directly by the browser, so it must handle CORS itself.
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (preg_match('#^https?://(localhost|127\.0\.0\.1)(:\d+)?$#i', $origin)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
}
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function respond(int $status, array $data): never {
    http_response_code($status);
    echo json_encode($data);
    exit;
}

if (session_status() !== PHP_SESSION_ACTIVE) {
    $https = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';

    session_set_cookie_params([
        'httponly' => true,
        'secure' => $https,
        'samesite' => 'Lax',
        'path' => '/',
    ]);

    session_start();
}

try {
    require_once __DIR__ . '/connect.php';

    if (!isset($conn) || !$conn instanceof PDO) {
        respond(500, [
            'success' => false,
            'error' => 'Database connection is not configured for PDO.'
        ]);
    }

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $loggedIn =
            !empty($_SESSION['user_id']) &&
            ($_SESSION['role'] ?? '') === 'admin';

        respond(200, [
            'success' => true,
            'authenticated' => $loggedIn,
            'user' => $loggedIn ? [
                'id' => $_SESSION['user_id'],
                'username' => $_SESSION['username'] ?? '',
                'fullName' => $_SESSION['full_name'] ?? '',
                'role' => 'admin'
            ] : null
        ]);
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        respond(405, [
            'success' => false,
            'error' => 'Method not allowed.'
        ]);
    }

    $raw = file_get_contents('php://input');
    $data = json_decode($raw ?: '', true);

    if (!is_array($data)) {
        respond(400, [
            'success' => false,
            'error' => 'Request body must contain valid JSON.'
        ]);
    }

    $action = $data['action'] ?? '';

    if ($action === 'logout') {
        $_SESSION = [];

        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();

            setcookie(session_name(), '', [
                'expires' => time() - 42000,
                'path' => $params['path'],
                'domain' => $params['domain'],
                'secure' => $params['secure'],
                'httponly' => $params['httponly'],
                'samesite' => $params['samesite'] ?? 'Lax'
            ]);
        }

        session_destroy();

        respond(200, [
            'success' => true,
            'message' => 'Logged out successfully.'
        ]);
    }

    if ($action !== 'login') {
        respond(400, [
            'success' => false,
            'error' => 'Unsupported action.'
        ]);
    }

    $username = trim((string)($data['username'] ?? ''));
    $password = (string)($data['password'] ?? '');

    if ($username === '' || $password === '') {
        respond(422, [
            'success' => false,
            'error' => 'Enter your username and password.'
        ]);
    }

    $stmt = $conn->prepare("
        SELECT AdminID, Username, PasswordHash, DisplayName AS FullName, Role
        FROM dbo.AdminUsers
        WHERE Username = ? AND IsActive = 1
    ");

    $stmt->execute([$username]);
    $admin = $stmt->fetch(PDO::FETCH_ASSOC);

    if (
        !$admin ||
        strtolower((string)$admin['Role']) !== 'admin' ||
        !password_verify($password, (string)$admin['PasswordHash'])
    ) {
        respond(401, [
            'success' => false,
            'error' => 'Invalid username or password.'
        ]);
    }

    session_regenerate_id(true);

    $_SESSION['user_id'] = (int)$admin['AdminID'];
    $_SESSION['username'] = $admin['Username'];
    $_SESSION['full_name'] = $admin['FullName'];
    $_SESSION['role'] = 'admin';

    respond(200, [
        'success' => true,
        'message' => 'Login successful.',
        'authenticated' => true,
        'user' => [
            'id' => (int)$admin['AdminID'],
            'username' => $admin['Username'],
            'fullName' => $admin['FullName'],
            'role' => 'admin'
        ]
    ]);

} catch (Throwable $e) {
    error_log('AdminAuth error: ' . $e->getMessage());

    respond(500, [
        'success' => false,
        'error' => 'Authentication service failed. Check the PHP error log.'
    ]);
}
