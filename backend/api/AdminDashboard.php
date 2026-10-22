<?php
// declare(strict_types=1);

require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/connect.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    adminResponse(['error' => 'Method not allowed'], 405);
}

requireAdmin();

try {
    $pdo = db();

    $sql = "
        SELECT
            (SELECT COUNT(*)
             FROM dbo.Movies
             WHERE IsActive = 1) AS Movies,

            (SELECT COUNT(*)
             FROM dbo.Showtimes
             WHERE Status = 'Scheduled'
               AND StartTime >= SYSDATETIME()) AS UpcomingShowtimes,

            (SELECT COUNT(*)
             FROM dbo.Bookings
             WHERE Status = 'Confirmed') AS Bookings,

            (SELECT COALESCE(SUM(TotalAmount), 0)
             FROM dbo.Bookings
             WHERE Status = 'Confirmed') AS Revenue
    ";

    $stats = $pdo->query($sql)->fetch();

    adminResponse([
        'success' => true,
        'stats' => [
            'movies' => (int) $stats['Movies'],
            'upcomingShowtimes' => (int) $stats['UpcomingShowtimes'],
            'bookings' => (int) $stats['Bookings'],
            'revenue' => (float) $stats['Revenue'],
        ],
    ]);
} catch (Throwable $e) {
    error_log($e->getMessage());
    adminResponse(['error' => 'Could not load dashboard statistics'], 500);
}
