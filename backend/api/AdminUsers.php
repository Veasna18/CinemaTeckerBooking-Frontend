<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/connect.php';
requireAdmin();

try {
    $pdo = db();

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $stmt = $pdo->query(
            "SELECT AdminID, Username, DisplayName, Role, IsActive, CreatedAt
             FROM dbo.AdminUsers
             ORDER BY CreatedAt DESC"
        );
        respond(['success' => true, 'users' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        header('Allow: GET, POST, OPTIONS');
        respond(['success' => false, 'error' => 'Method not allowed.'], 405);
    }

    $input = readJson();
    $username = trim((string)($input['username'] ?? ''));
    $displayName = trim((string)($input['displayName'] ?? ''));
    $password = (string)($input['password'] ?? '');

    if (!preg_match('/^[A-Za-z0-9._-]{3,80}$/', $username)) {
        respond(['success' => false, 'error' => 'Username must be 3-80 characters and use only letters, numbers, dot, underscore or dash.'], 422);
    }
    if ($displayName === '' || mb_strlen($displayName) > 120) {
        respond(['success' => false, 'error' => 'Enter a valid display name.'], 422);
    }
    if (strlen($password) < 8 || strlen($password) > 255) {
        respond(['success' => false, 'error' => 'Password must be at least 8 characters.'], 422);
    }

    $stmt = $pdo->prepare(
        "INSERT INTO dbo.AdminUsers (Username, PasswordHash, DisplayName, Role, IsActive)
         VALUES (?, ?, ?, 'admin', 1)"
    );
    $stmt->execute([$username, password_hash($password, PASSWORD_DEFAULT), $displayName]);

    respond(['success' => true, 'message' => 'Admin user created successfully.'], 201);
} catch (PDOException $e) {
    error_log('AdminUsers database error: ' . $e->getMessage());
    if (in_array((int)($e->errorInfo[1] ?? 0), [2601, 2627], true)) {
        respond(['success' => false, 'error' => 'That username already exists.'], 409);
    }
    respond(['success' => false, 'error' => 'Unable to create admin user.'], 500);
} catch (Throwable $e) {
    error_log('AdminUsers error: ' . $e->getMessage());
    respond(['success' => false, 'error' => 'Unable to process admin users.'], 500);
}
