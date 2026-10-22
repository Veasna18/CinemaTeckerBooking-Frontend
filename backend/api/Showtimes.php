<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/connect.php';

$movieId = filter_input(INPUT_GET, 'movieId', FILTER_VALIDATE_INT);

if (!$movieId || $movieId < 1) {
    respond(['error' => 'Valid movieId is required'], 400);
}

try {
    $stmt = db()->prepare(
        "SELECT s.ShowtimeID, s.MovieID, s.StartTime,
                s.TicketPrice, h.HallName
         FROM Showtimes s
         JOIN Halls h ON h.HallID = s.HallID
         WHERE s.MovieID = ?
           AND s.Status = 'Scheduled'
           AND s.StartTime > SYSDATETIME()
         ORDER BY s.StartTime"
    );

    $stmt->execute([$movieId]);
    respond(['showtimes' => $stmt->fetchAll()]);
} catch (Throwable $e) {
    error_log($e->getMessage());
    respond(['error' => 'Unable to load showtimes'], 500);
}
