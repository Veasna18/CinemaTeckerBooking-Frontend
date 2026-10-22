<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/connect.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    header('Allow: GET, OPTIONS');
    respond(['error' => 'Method not allowed'], 405);
}

try {
    $stmt = db()->query(
        "SELECT ConcessionID, Name, Description, Price, ImageURL, IsAvailable
         FROM Concessions
         WHERE IsAvailable = 1
         ORDER BY Name"
    );
    respond(['success' => true, 'concessions' => $stmt->fetchAll()]);
} catch (Throwable $e) {
    error_log($e->getMessage());
    respond(['success' => false, 'error' => 'Unable to load concessions'], 500);
}
