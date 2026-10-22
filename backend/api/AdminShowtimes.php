<?php
require_once __DIR__ . '/cors.php';

require_once __DIR__ . '/connect.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

function showtimeResponse(int $status, array $data): never {
    http_response_code($status);
    echo json_encode($data);
    exit;
}

function requireCinemaAdmin(): void {
    // Adapt this check to the session variables set by your login API.
    if (
        empty($_SESSION['user_id']) ||
        !in_array($_SESSION['role'] ?? '', ['admin', 'Admin'], true)
    ) {
        showtimeResponse(401, [
            'success' => false,
            'error' => 'Administrator login required.'
        ]);
    }
}
requireCinemaAdmin();

try {
    if (!isset($conn) || !$conn instanceof PDO) {
        throw new RuntimeException('PDO connection $conn is not configured.');
    }

    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET') {
        $sql = "
            SELECT
                st.ShowtimeID,
                st.MovieID,
                st.HallID,
                st.StartTime,
                st.TicketPrice,
                st.Status,
                m.Title,
                m.DurationMinutes,
                h.HallName,
                (SELECT COUNT(*)
                 FROM dbo.BookingSeats bs
                 INNER JOIN dbo.Bookings b ON b.BookingID = bs.BookingID
                 WHERE bs.ShowtimeID = st.ShowtimeID
                   AND b.Status = 'Confirmed') AS BookedSeats
            FROM dbo.Showtimes st
            INNER JOIN dbo.Movies m ON m.MovieID = st.MovieID
            INNER JOIN dbo.Halls h ON h.HallID = st.HallID
            ORDER BY st.StartTime DESC
        ";

        $showtimes = $conn->query($sql)->fetchAll(PDO::FETCH_ASSOC);

        $movies = $conn->query("
            SELECT MovieID, Title, DurationMinutes, IsActive
            FROM dbo.Movies
            ORDER BY Title
        ")->fetchAll(PDO::FETCH_ASSOC);

        $halls = $conn->query("
            SELECT HallID, HallName, TotalRows, SeatsPerRow
            FROM dbo.Halls
            ORDER BY HallName
        ")->fetchAll(PDO::FETCH_ASSOC);

        showtimeResponse(200, [
            'success' => true,
            'showtimes' => $showtimes,
            'movies' => $movies,
            'halls' => $halls
        ]);
    }

    if ($method !== 'POST') {
        showtimeResponse(405, [
            'success' => false,
            'error' => 'Method not allowed.'
        ]);
    }

    $input = json_decode(file_get_contents('php://input'), true);

    if (!is_array($input)) {
        showtimeResponse(400, [
            'success' => false,
            'error' => 'Invalid JSON request.'
        ]);
    }

    $action = $input['action'] ?? '';

    if ($action === 'createMany') {
        $movieId = filter_var($input['movieId'] ?? null, FILTER_VALIDATE_INT);
        $hallId = filter_var($input['hallId'] ?? null, FILTER_VALIDATE_INT);
        $price = filter_var($input['ticketPrice'] ?? null, FILTER_VALIDATE_FLOAT);
        $rawTimes = $input['startTimes'] ?? null;

        if (
            !$movieId || !$hallId ||
            $price === false || $price < 0 || $price > 100000 ||
            !is_array($rawTimes) || count($rawTimes) < 1 || count($rawTimes) > 50
        ) {
            showtimeResponse(422, [
                'success' => false,
                'error' => 'Enter a valid movie, hall, ticket price and 1 to 50 start times.'
            ]);
        }

        $stmt = $conn->prepare("
            SELECT DurationMinutes FROM dbo.Movies
            WHERE MovieID = ? AND IsActive = 1
        ");
        $stmt->execute([$movieId]);
        $duration = $stmt->fetchColumn();

        if ($duration === false) {
            showtimeResponse(422, [
                'success' => false,
                'error' => 'The selected movie is unavailable.'
            ]);
        }

        $stmt = $conn->prepare("SELECT COUNT(*) FROM dbo.Halls WHERE HallID = ?");
        $stmt->execute([$hallId]);

        if ((int)$stmt->fetchColumn() === 0) {
            showtimeResponse(422, [
                'success' => false,
                'error' => 'The selected hall does not exist.'
            ]);
        }

        $duration = max(1, (int)$duration);
        $dates = [];

        foreach ($rawTimes as $raw) {
            $date = DateTime::createFromFormat('!Y-m-d\TH:i', trim((string)$raw))
                ?: DateTime::createFromFormat('!Y-m-d\TH:i:s', trim((string)$raw));

            if (!$date) {
                showtimeResponse(422, [
                    'success' => false,
                    'error' => 'Every start time must be a valid date and time.'
                ]);
            }

            $dates[] = $date;
        }

        usort($dates, fn($a, $b) => $a <=> $b);

        for ($i = 1; $i < count($dates); $i++) {
            $gap = ($dates[$i]->getTimestamp() - $dates[$i - 1]->getTimestamp()) / 60;
            if ($gap < $duration) {
                showtimeResponse(409, [
                    'success' => false,
                    'error' => 'Two of the selected times overlap in the same hall: '
                        . $dates[$i - 1]->format('Y-m-d H:i') . ' and '
                        . $dates[$i]->format('Y-m-d H:i') . '.'
                ]);
            }
        }

        $overlap = $conn->prepare("
            SELECT TOP 1 st.StartTime
            FROM dbo.Showtimes st
            INNER JOIN dbo.Movies m ON m.MovieID = st.MovieID
            WHERE st.HallID = ?
              AND st.Status <> 'Cancelled'
              AND st.StartTime < DATEADD(MINUTE, ?, ?)
              AND DATEADD(MINUTE, m.DurationMinutes, st.StartTime) > ?
        ");

        $conn->beginTransaction();

        try {
            $insert = $conn->prepare("
                INSERT INTO dbo.Showtimes
                    (MovieID, HallID, StartTime, TicketPrice, Status)
                VALUES (?, ?, ?, ?, 'Scheduled')
            ");

            foreach ($dates as $date) {
                $start = $date->format('Y-m-d H:i:s');
                $overlap->execute([$hallId, $duration, $start, $start]);
                $clash = $overlap->fetchColumn();

                if ($clash !== false) {
                    throw new RuntimeException(
                        'The hall is already in use at ' . $date->format('Y-m-d H:i') . '.'
                    );
                }

                $insert->execute([$movieId, $hallId, $start, $price]);
            }

            $conn->commit();
        } catch (RuntimeException $e) {
            $conn->rollBack();
            showtimeResponse(409, [
                'success' => false,
                'error' => $e->getMessage()
            ]);
        } catch (Throwable $e) {
            $conn->rollBack();
            throw $e;
        }

        showtimeResponse(201, [
            'success' => true,
            'message' => count($dates) . ' showtimes created successfully.'
        ]);
    }

    if ($action === 'create' || $action === 'update') {
        $movieId = filter_var(
            $input['movieId'] ?? null,
            FILTER_VALIDATE_INT
        );
        $hallId = filter_var(
            $input['hallId'] ?? null,
            FILTER_VALIDATE_INT
        );
        $price = filter_var(
            $input['ticketPrice'] ?? null,
            FILTER_VALIDATE_FLOAT
        );
        $startTime = trim((string)($input['startTime'] ?? ''));
        $status = (string)($input['status'] ?? 'Scheduled');

        if (
            !$movieId || !$hallId ||
            $price === false || $price < 0 || $price > 100000 ||
            !in_array($status, ['Scheduled', 'Cancelled', 'Completed'], true)
        ) {
            showtimeResponse(422, [
                'success' => false,
                'error' => 'Enter a valid movie, hall, ticket price and status.'
            ]);
        }

        $date = DateTime::createFromFormat('!Y-m-d\TH:i', $startTime)
            ?: DateTime::createFromFormat('!Y-m-d\TH:i:s', $startTime);

        if (!$date) {
            showtimeResponse(422, [
                'success' => false,
                'error' => 'A valid start time is required.'
            ]);
        }

        $startTime = $date->format('Y-m-d H:i:s');

        $check = $conn->prepare("
            SELECT COUNT(*)
            FROM dbo.Movies
            WHERE MovieID = ? AND IsActive = 1
        ");
        $check->execute([$movieId]);

        if ((int)$check->fetchColumn() === 0) {
            showtimeResponse(422, [
                'success' => false,
                'error' => 'The selected movie is unavailable.'
            ]);
        }

        $check = $conn->prepare("
            SELECT COUNT(*) FROM dbo.Halls WHERE HallID = ?
        ");
        $check->execute([$hallId]);

        if ((int)$check->fetchColumn() === 0) {
            showtimeResponse(422, [
                'success' => false,
                'error' => 'The selected hall does not exist.'
            ]);
        }

        if ($action === 'create') {
            $stmt = $conn->prepare("
                INSERT INTO dbo.Showtimes
                    (MovieID, HallID, StartTime, TicketPrice, Status)
                VALUES (?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $movieId, $hallId, $startTime, $price, $status
            ]);

            showtimeResponse(201, [
                'success' => true,
                'message' => 'Showtime created successfully.'
            ]);
        }

        $id = filter_var(
            $input['showtimeId'] ?? null,
            FILTER_VALIDATE_INT
        );

        if (!$id) {
            showtimeResponse(422, [
                'success' => false,
                'error' => 'A valid showtime ID is required.'
            ]);
        }

        $stmt = $conn->prepare("
            UPDATE dbo.Showtimes
            SET MovieID = ?, HallID = ?, StartTime = ?,
                TicketPrice = ?, Status = ?
            WHERE ShowtimeID = ?
        ");
        $stmt->execute([
            $movieId, $hallId, $startTime, $price, $status, $id
        ]);

        showtimeResponse(200, [
            'success' => true,
            'message' => 'Showtime updated successfully.'
        ]);
    }

    if ($action === 'cancel') {
        $id = filter_var(
            $input['showtimeId'] ?? null,
            FILTER_VALIDATE_INT
        );

        if (!$id) {
            showtimeResponse(422, [
                'success' => false,
                'error' => 'A valid showtime ID is required.'
            ]);
        }

        $conn->beginTransaction();

        try {
            // Same lock Booking.php takes, so nobody can book while we cancel.
            $stmt = $conn->prepare("
                SELECT Status
                FROM dbo.Showtimes WITH (UPDLOCK, HOLDLOCK)
                WHERE ShowtimeID = ?
            ");
            $stmt->execute([$id]);
            $current = $stmt->fetchColumn();

            if ($current === false) {
                $conn->rollBack();
                showtimeResponse(404, [
                    'success' => false,
                    'error' => 'Showtime not found.'
                ]);
            }

            if ($current !== 'Scheduled') {
                $conn->rollBack();
                showtimeResponse(409, [
                    'success' => false,
                    'error' => 'Only scheduled showtimes can be cancelled.'
                ]);
            }

            $stmt = $conn->prepare("
                SELECT COUNT(*)
                FROM dbo.Bookings
                WHERE ShowtimeID = ? AND Status = 'Confirmed'
            ");
            $stmt->execute([$id]);
            $confirmed = (int)$stmt->fetchColumn();

            if ($confirmed > 0) {
                $conn->rollBack();
                showtimeResponse(409, [
                    'success' => false,
                    'error' => "This showtime has $confirmed confirmed booking(s). "
                        . 'Cancel those bookings on the Bookings page first, '
                        . 'then cancel the showtime.'
                ]);
            }

            $stmt = $conn->prepare("
                UPDATE dbo.Showtimes
                SET Status = 'Cancelled'
                WHERE ShowtimeID = ?
            ");
            $stmt->execute([$id]);

            $conn->commit();
        } catch (Throwable $e) {
            if ($conn->inTransaction()) {
                $conn->rollBack();
            }
            throw $e;
        }

        showtimeResponse(200, [
            'success' => true,
            'message' => 'Showtime cancelled.'
        ]);
    }

    if ($action === 'delete') {
        $id = filter_var(
            $input['showtimeId'] ?? null,
            FILTER_VALIDATE_INT
        );

        if (!$id) {
            showtimeResponse(422, [
                'success' => false,
                'error' => 'A valid showtime ID is required.'
            ]);
        }

        $stmt = $conn->prepare("
            SELECT
                (SELECT COUNT(*) FROM dbo.Bookings
                 WHERE ShowtimeID = ?) AS BookingCount,
                (SELECT COUNT(*) FROM dbo.BookingSeats
                 WHERE ShowtimeID = ?) AS SeatCount
        ");
        $stmt->execute([$id, $id]);
        $counts = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$counts) {
            showtimeResponse(404, [
                'success' => false,
                'error' => 'Showtime not found.'
            ]);
        }

        if ((int)$counts['BookingCount'] > 0 ||
            (int)$counts['SeatCount'] > 0) {
            showtimeResponse(409, [
                'success' => false,
                'error' => 'This showtime has booking history. Cancel it instead of deleting it.'
            ]);
        }

        $stmt = $conn->prepare("
            DELETE FROM dbo.Showtimes WHERE ShowtimeID = ?
        ");
        $stmt->execute([$id]);

        showtimeResponse(200, [
            'success' => true,
            'message' => 'Showtime deleted successfully.'
        ]);
    }

    showtimeResponse(400, [
        'success' => false,
        'error' => 'Unsupported action.'
    ]);

} catch (PDOException $e) {
    error_log('AdminShowtimes database error: ' . $e->getMessage());

    // pdo_sqlsrv puts the native SQL Server error number in errorInfo[1];
    // it is not part of the message text.
    $status = in_array((int)($e->errorInfo[1] ?? 0), [2601, 2627], true) ? 409 : 500;

    showtimeResponse($status, [
        'success' => false,
        'error' => $status === 409
            ? 'A showtime already exists for this hall and start time.'
            : 'Unable to process showtimes.'
    ]);
} catch (Throwable $e) {
    error_log('AdminShowtimes error: ' . $e->getMessage());

    showtimeResponse(500, [
        'success' => false,
        'error' => 'Unable to process showtimes.'
    ]);
}
