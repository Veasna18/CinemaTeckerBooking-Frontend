<?php
require_once __DIR__ . '/cors.php';
// declare(strict_types=1);

require_once __DIR__ . '/connect.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

if (session_status() !== PHP_SESSION_ACTIVE) session_start();

function bookingResponse(int $status, array $data): never {
    http_response_code($status);
    echo json_encode($data);
    exit;
}

if (
    empty($_SESSION['user_id']) ||
    !in_array($_SESSION['role'] ?? '', ['admin', 'Admin'], true)
) {
    bookingResponse(401, [
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
        $sql = "
            SELECT
                b.BookingID,
                CONVERT(NVARCHAR(36), b.BookingCode) AS BookingCode,
                b.CustomerName,
                b.CustomerPhone,
                b.ShowtimeID,
                b.BookingDate,
                b.TotalAmount,
                b.Status,
                m.Title,
                st.StartTime,
                h.HallName,
                COALESCE(seats.SeatLabels, '') AS Seats
            FROM dbo.Bookings b
            INNER JOIN dbo.Showtimes st
                ON st.ShowtimeID = b.ShowtimeID
            INNER JOIN dbo.Movies m
                ON m.MovieID = st.MovieID
            INNER JOIN dbo.Halls h
                ON h.HallID = st.HallID
            OUTER APPLY (
                SELECT STRING_AGG(
                    CAST(
                        CONCAT(s.RowLabel, s.SeatNumber)
                        AS NVARCHAR(MAX)
                    ),
                    ', '
                ) AS SeatLabels
                FROM dbo.BookingSeats bs
                INNER JOIN dbo.Seats s ON s.SeatID = bs.SeatID
                WHERE bs.BookingID = b.BookingID
            ) seats
            ORDER BY b.BookingDate DESC
        ";

        $stmt = $conn->query($sql);

        bookingResponse(200, [
            'success' => true,
            'bookings' => $stmt->fetchAll(PDO::FETCH_ASSOC)
        ]);
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        bookingResponse(405, [
            'success' => false,
            'error' => 'Method not allowed.'
        ]);
    }

    $data = json_decode(file_get_contents('php://input'), true);

    if (!is_array($data)) {
        bookingResponse(400, [
            'success' => false,
            'error' => 'Invalid JSON request.'
        ]);
    }

    if (($data['action'] ?? '') !== 'cancel') {
        bookingResponse(400, [
            'success' => false,
            'error' => 'Unsupported action.'
        ]);
    }

    $id = filter_var(
        $data['bookingId'] ?? null,
        FILTER_VALIDATE_INT
    );

    if (!$id || $id < 1) {
        bookingResponse(422, [
            'success' => false,
            'error' => 'Valid booking ID required.'
        ]);
    }

    $conn->beginTransaction();

    // Lock the booking to prevent simultaneous cancellation requests.
    $stmt = $conn->prepare("
        SELECT BookingID, Status, ShowtimeID
        FROM dbo.Bookings WITH (UPDLOCK, HOLDLOCK)
        WHERE BookingID = ?
    ");
    $stmt->execute([$id]);

    $booking = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$booking) {
        $conn->rollBack();

        bookingResponse(404, [
            'success' => false,
            'error' => 'Booking not found.'
        ]);
    }

    if ($booking['Status'] !== 'Confirmed') {
        $conn->rollBack();

        bookingResponse(409, [
            'success' => false,
            'error' => 'Only confirmed bookings can be cancelled.'
        ]);
    }

    // Do not cancel bookings for screenings that have already started.
    // Compare inside SQL Server: StartTime is stored in the server's local
    // time, so comparing it with PHP's time() is wrong whenever PHP's
    // date.timezone differs from the SQL Server clock.
    $stmt = $conn->prepare("
        SELECT CASE WHEN StartTime > SYSDATETIME() THEN 1 ELSE 0 END
        FROM dbo.Showtimes
        WHERE ShowtimeID = ?
    ");
    $stmt->execute([$booking['ShowtimeID']]);
    $notStarted = $stmt->fetchColumn();

    if ($notStarted === false || (int)$notStarted !== 1) {
        $conn->rollBack();

        bookingResponse(409, [
            'success' => false,
            'error' => 'Bookings cannot be cancelled after the screening starts.'
        ]);
    }

    /*
     * The supplied schema has UNIQUE (ShowtimeID, SeatID).
     * Remove the seat allocations so cancelled seats can be booked again.
     * This means cancelled booking seat history is not retained in
     * BookingSeats; see the schema improvement below.
     */
    $stmt = $conn->prepare("
        DELETE FROM dbo.BookingSeats
        WHERE BookingID = ?
    ");
    $stmt->execute([$id]);

    $stmt = $conn->prepare("
        UPDATE dbo.Bookings
        SET Status = 'Cancelled'
        WHERE BookingID = ? AND Status = 'Confirmed'
    ");
    $stmt->execute([$id]);

    if ($stmt->rowCount() !== 1) {
        throw new RuntimeException('Booking status could not be updated.');
    }

    $conn->commit();

    bookingResponse(200, [
        'success' => true,
        'message' => 'Booking cancelled successfully.'
    ]);

} catch (PDOException $e) {
    if (isset($conn) && $conn instanceof PDO && $conn->inTransaction()) {
        $conn->rollBack();
    }

    error_log('AdminBookings database error: ' . $e->getMessage());

    bookingResponse(500, [
        'success' => false,
        'error' => 'Unable to process bookings.'
    ]);
} catch (Throwable $e) {
    if (isset($conn) && $conn instanceof PDO && $conn->inTransaction()) {
        $conn->rollBack();
    }

    error_log('AdminBookings error: ' . $e->getMessage());

    bookingResponse(500, [
        'success' => false,
        'error' => 'Unable to process booking cancellation.'
    ]);
}
