<?php
require_once __DIR__ . '/cors.php';
// declare(strict_types=1);

require_once __DIR__ . '/connect.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

if (session_status() !== PHP_SESSION_ACTIVE) session_start();

function discountResponse(int $status, array $data): never {
    http_response_code($status);
    echo json_encode($data);
    exit;
}

if (
    empty($_SESSION['user_id']) ||
    !in_array($_SESSION['role'] ?? '', ['admin', 'Admin'], true)
) {
    discountResponse(401, [
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
            SELECT DiscountID, Code, Description, DiscountType,
                   DiscountValue, StartDate, EndDate, UsageLimit,
                   UsedCount, IsActive, CreatedAt
            FROM dbo.Discounts
            ORDER BY CreatedAt DESC
        ");

        discountResponse(200, [
            'success' => true,
            'discounts' => $stmt->fetchAll(PDO::FETCH_ASSOC)
        ]);
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        discountResponse(405, [
            'success' => false,
            'error' => 'Method not allowed.'
        ]);
    }

    $data = json_decode(file_get_contents('php://input'), true);

    if (!is_array($data)) {
        discountResponse(400, [
            'success' => false,
            'error' => 'Invalid JSON request.'
        ]);
    }

    $action = $data['action'] ?? '';

    if ($action === 'delete') {
        $id = filter_var($data['discountId'] ?? null, FILTER_VALIDATE_INT);

        if (!$id) {
            discountResponse(422, [
                'success' => false,
                'error' => 'Valid discount ID required.'
            ]);
        }

        $stmt = $conn->prepare(
            "DELETE FROM dbo.Discounts WHERE DiscountID = ?"
        );
        $stmt->execute([$id]);

        if (!$stmt->rowCount()) {
            discountResponse(404, [
                'success' => false,
                'error' => 'Discount not found.'
            ]);
        }

        discountResponse(200, [
            'success' => true,
            'message' => 'Discount deleted.'
        ]);
    }

    if ($action === 'toggle') {
        $id = filter_var($data['discountId'] ?? null, FILTER_VALIDATE_INT);

        if (!$id || !isset($data['isActive'])) {
            discountResponse(422, [
                'success' => false,
                'error' => 'Discount ID and active status are required.'
            ]);
        }

        $stmt = $conn->prepare("
            UPDATE dbo.Discounts
            SET IsActive = ?
            WHERE DiscountID = ?
        ");
        $stmt->execute([(int)(bool)$data['isActive'], $id]);

        if (!$stmt->rowCount()) {
            $check = $conn->prepare(
                "SELECT COUNT(*) FROM dbo.Discounts WHERE DiscountID = ?"
            );
            $check->execute([$id]);

            if (!(int)$check->fetchColumn()) {
                discountResponse(404, [
                    'success' => false,
                    'error' => 'Discount not found.'
                ]);
            }
        }

        discountResponse(200, [
            'success' => true,
            'message' => 'Discount status updated.'
        ]);
    }

    if (!in_array($action, ['create', 'update'], true)) {
        discountResponse(400, [
            'success' => false,
            'error' => 'Unsupported action.'
        ]);
    }

    $code = strtoupper(trim((string)($data['code'] ?? '')));
    $description = trim((string)($data['description'] ?? ''));
    $type = (string)($data['discountType'] ?? '');
    $value = filter_var($data['discountValue'] ?? null, FILTER_VALIDATE_FLOAT);
    $usage = ($data['usageLimit'] ?? '') === '' ||
             ($data['usageLimit'] ?? null) === null
        ? null
        : filter_var($data['usageLimit'], FILTER_VALIDATE_INT);
    $start = (string)($data['startDate'] ?? '');
    $end = (string)($data['endDate'] ?? '');
    $active = (int)(bool)($data['isActive'] ?? true);

    if (
        !preg_match('/^[A-Z0-9_-]{3,40}$/', $code) ||
        mb_strlen($description) > 300 ||
        !in_array($type, ['Percent', 'Fixed'], true) ||
        $value === false || $value <= 0 ||
        ($type === 'Percent' && $value > 100) ||
        ($type === 'Fixed' && $value > 100000) ||
        ($usage !== null && ($usage === false || $usage < 0))
    ) {
        discountResponse(422, [
            'success' => false,
            'error' => 'Check the discount code, type, value and usage limit.'
        ]);
    }

    try {
        $startDate = new DateTimeImmutable($start);
        $endDate = new DateTimeImmutable($end);
    } catch (Throwable $e) {
        discountResponse(422, [
            'success' => false,
            'error' => 'Valid start and end dates are required.'
        ]);
    }

    if ($endDate <= $startDate) {
        discountResponse(422, [
            'success' => false,
            'error' => 'End date must be after start date.'
        ]);
    }

    if ($action === 'create') {
        $stmt = $conn->prepare("
            INSERT INTO dbo.Discounts
                (Code, Description, DiscountType, DiscountValue,
                 StartDate, EndDate, UsageLimit, IsActive)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $code,
            $description ?: null,
            $type,
            $value,
            $startDate->format('Y-m-d H:i:s'),
            $endDate->format('Y-m-d H:i:s'),
            $usage,
            $active
        ]);

        discountResponse(201, [
            'success' => true,
            'message' => 'Discount created.'
        ]);
    }

    $id = filter_var($data['discountId'] ?? null, FILTER_VALIDATE_INT);

    if (!$id) {
        discountResponse(422, [
            'success' => false,
            'error' => 'Valid discount ID required.'
        ]);
    }

    $stmt = $conn->prepare("
        UPDATE dbo.Discounts
        SET Code = ?, Description = ?, DiscountType = ?,
            DiscountValue = ?, StartDate = ?, EndDate = ?,
            UsageLimit = ?, IsActive = ?
        WHERE DiscountID = ?
    ");
    $stmt->execute([
        $code,
        $description ?: null,
        $type,
        $value,
        $startDate->format('Y-m-d H:i:s'),
        $endDate->format('Y-m-d H:i:s'),
        $usage,
        $active,
        $id
    ]);

    discountResponse(200, [
        'success' => true,
        'message' => 'Discount updated.'
    ]);

} catch (PDOException $e) {
    error_log('AdminDiscounts: ' . $e->getMessage());

    // pdo_sqlsrv puts the native SQL Server error number in errorInfo[1];
    // it is not part of the message text.
    $duplicate = in_array((int)($e->errorInfo[1] ?? 0), [2601, 2627], true);

    discountResponse($duplicate ? 409 : 500, [
        'success' => false,
        'error' => $duplicate
            ? 'That discount code already exists.'
            : 'Unable to process discounts.'
    ]);
} catch (Throwable $e) {
    error_log('AdminDiscounts: ' . $e->getMessage());

    discountResponse(500, [
        'success' => false,
        'error' => 'Unable to process discounts.'
    ]);
}
