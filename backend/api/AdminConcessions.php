<?php
require_once __DIR__ . '/cors.php';
// declare(strict_types=1);

require_once __DIR__ . '/connect.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

if (session_status() !== PHP_SESSION_ACTIVE) session_start();

function concessionResponse(int $status, array $data): never {
    http_response_code($status);
    echo json_encode($data);
    exit;
}

if (
    empty($_SESSION['user_id']) ||
    !in_array($_SESSION['role'] ?? '', ['admin', 'Admin'], true)
) {
    concessionResponse(401, [
        'success' => false,
        'error' => 'Administrator login required.'
    ]);
}

try {
    if (!isset($conn) || !$conn instanceof PDO) {
        throw new RuntimeException('PDO connection $conn is missing.');
    }

    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $stmt = $conn->query("
            SELECT ConcessionID, Name, Description, Price,
                   ImageURL, IsAvailable
            FROM dbo.Concessions
            ORDER BY Name
        ");

        concessionResponse(200, [
            'success' => true,
            'concessions' => $stmt->fetchAll(PDO::FETCH_ASSOC)
        ]);
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        concessionResponse(405, [
            'success' => false,
            'error' => 'Method not allowed.'
        ]);
    }

    $data = json_decode(file_get_contents('php://input'), true);

    if (!is_array($data)) {
        concessionResponse(400, [
            'success' => false,
            'error' => 'Invalid JSON request.'
        ]);
    }

    $action = $data['action'] ?? '';

    if ($action === 'toggle') {
        $id = filter_var(
            $data['concessionId'] ?? null,
            FILTER_VALIDATE_INT
        );

        if (!$id || !array_key_exists('isAvailable', $data)) {
            concessionResponse(422, [
                'success' => false,
                'error' => 'Concession ID and availability are required.'
            ]);
        }

        $stmt = $conn->prepare("
            UPDATE dbo.Concessions
            SET IsAvailable = ?
            WHERE ConcessionID = ?
        ");
        $stmt->execute([(int)(bool)$data['isAvailable'], $id]);

        if (!$stmt->rowCount()) {
            $check = $conn->prepare(
                "SELECT COUNT(*) FROM dbo.Concessions WHERE ConcessionID = ?"
            );
            $check->execute([$id]);

            if (!(int)$check->fetchColumn()) {
                concessionResponse(404, [
                    'success' => false,
                    'error' => 'Concession not found.'
                ]);
            }
        }

        concessionResponse(200, [
            'success' => true,
            'message' => 'Availability updated.'
        ]);
    }

    if (!in_array($action, ['create', 'update'], true)) {
        concessionResponse(400, [
            'success' => false,
            'error' => 'Unsupported action.'
        ]);
    }

    $name = trim((string)($data['name'] ?? ''));
    $description = trim((string)($data['description'] ?? ''));
    $price = filter_var($data['price'] ?? null, FILTER_VALIDATE_FLOAT);
    $imageURL = trim((string)($data['imageURL'] ?? ''));
    $available = (int)(bool)($data['isAvailable'] ?? true);

    if (
        $name === '' ||
        mb_strlen($name) > 100 ||
        mb_strlen($description) > 300 ||
        $price === false || $price < 0 || $price > 100000 ||
        mb_strlen($imageURL) > 500
    ) {
        concessionResponse(422, [
            'success' => false,
            'error' => 'Enter a valid product name, description and price.'
        ]);
    }

    if ($imageURL !== '') {
        $url = filter_var($imageURL, FILTER_VALIDATE_URL);
        $scheme = strtolower((string)parse_url($imageURL, PHP_URL_SCHEME));
        $localUpload = (bool) preg_match('#^/[A-Za-z0-9._-]+/(?:backend/)?public/uploads/concessions/[A-Za-z0-9._-]+$#', $imageURL);

        if ((!$url || !in_array($scheme, ['http', 'https'], true)) && !$localUpload) {
            concessionResponse(422, [
                'success' => false,
                'error' => 'Product image must be uploaded from the device.'
            ]);
        }
    }

    if ($action === 'create') {
        $stmt = $conn->prepare("
            INSERT INTO dbo.Concessions
                (Name, Description, Price, ImageURL, IsAvailable)
            VALUES (?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $name,
            $description ?: null,
            $price,
            $imageURL ?: null,
            $available
        ]);

        concessionResponse(201, [
            'success' => true,
            'message' => 'Concession created successfully.'
        ]);
    }

    $id = filter_var(
        $data['concessionId'] ?? null,
        FILTER_VALIDATE_INT
    );

    if (!$id) {
        concessionResponse(422, [
            'success' => false,
            'error' => 'Valid concession ID required.'
        ]);
    }

    $stmt = $conn->prepare("
        UPDATE dbo.Concessions
        SET Name = ?, Description = ?, Price = ?,
            ImageURL = ?, IsAvailable = ?
        WHERE ConcessionID = ?
    ");
    $stmt->execute([
        $name,
        $description ?: null,
        $price,
        $imageURL ?: null,
        $available,
        $id
    ]);

    concessionResponse(200, [
        'success' => true,
        'message' => 'Concession updated successfully.'
    ]);

} catch (PDOException $e) {
    error_log('AdminConcessions: ' . $e->getMessage());

    concessionResponse(500, [
        'success' => false,
        'error' => 'Unable to process concessions.'
    ]);
} catch (Throwable $e) {
    error_log('AdminConcessions: ' . $e->getMessage());

    concessionResponse(500, [
        'success' => false,
        'error' => 'Unable to process concessions.'
    ]);
}
