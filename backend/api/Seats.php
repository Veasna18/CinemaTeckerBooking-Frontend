<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/connect.php';

$showtimeId = filter_input(INPUT_GET, 'showtimeId', FILTER_VALIDATE_INT);

if (!$showtimeId || $showtimeId < 1) {
    respond(['error' => 'Valid showtimeId is required'], 400);
}

try {
    $pdo = db();

    // Return the showtime details together with the seats. The booking page
    // used to rely on whatever showtime was left in client state, so a page
    // refresh or a direct /seats/:id link produced $0.00 tickets, and picking
    // a different showtime reused the previous one's price and start time.
    $showStmt = $pdo->prepare(
        "SELECT sh.ShowtimeID, sh.MovieID, sh.StartTime, sh.TicketPrice,
                sh.Status, h.HallName, m.Title,
                CASE WHEN sh.StartTime > SYSDATETIME() THEN 1 ELSE 0 END AS HasNotStarted
         FROM Showtimes sh
         JOIN Halls h ON h.HallID = sh.HallID
         JOIN Movies m ON m.MovieID = sh.MovieID
         WHERE sh.ShowtimeID = ?"
    );
    $showStmt->execute([$showtimeId]);
    $show = $showStmt->fetch();

    if (!$show) {
        respond(['error' => 'Showtime not found'], 404);
    }

    if ($show['Status'] !== 'Scheduled' || (int)$show['HasNotStarted'] !== 1) {
        respond(['error' => 'This showtime is no longer available for booking.'], 409);
    }

    $stmt = $pdo->prepare(
        "SELECT st.SeatID, st.RowLabel, st.SeatNumber,
                st.SeatType,
                CASE WHEN bs.SeatID IS NULL THEN 0 ELSE 1 END AS IsBooked
         FROM Showtimes sh
         JOIN Seats st ON st.HallID = sh.HallID
         LEFT JOIN BookingSeats bs
           ON bs.SeatID = st.SeatID
          AND bs.ShowtimeID = sh.ShowtimeID
         WHERE sh.ShowtimeID = ?
         ORDER BY st.RowLabel, st.SeatNumber"
    );
    $stmt->execute([$showtimeId]);

    respond([
        'showtime' => [
            'ShowtimeID' => (int)$show['ShowtimeID'],
            'MovieID' => (int)$show['MovieID'],
            'StartTime' => $show['StartTime'],
            'TicketPrice' => $show['TicketPrice'],
            'HallName' => $show['HallName'],
            'Title' => $show['Title'],
        ],
        'seats' => $stmt->fetchAll(),
    ]);
} catch (Throwable $e) {
    error_log($e->getMessage());
    respond(['error' => 'Unable to load seats'], 500);
}
