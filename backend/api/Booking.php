<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/connect.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST, OPTIONS');
    respond(['error' => 'Method not allowed'], 405);
}

$input = readJson();
$name = trim((string)($input['customerName'] ?? ''));
$email = filter_var(trim((string)($input['customerEmail'] ?? '')), FILTER_VALIDATE_EMAIL);
$phone = trim((string)($input['customerPhone'] ?? ''));
$showtimeId = filter_var($input['showtimeId'] ?? null, FILTER_VALIDATE_INT);
$seatIds = $input['seatIds'] ?? [];
$concessions = $input['concessions'] ?? [];

if ($name === '' || mb_strlen($name) > 120 || !$email || !$showtimeId || $showtimeId < 1 ||
    !preg_match('/^[0-9+\s().-]{7,30}$/', $phone) || !is_array($seatIds) || count($seatIds) < 1 || count($seatIds) > 10 || !is_array($concessions)) {
    respond(['error' => 'Please provide valid booking details'], 422);
}

$seatIds = array_map(fn($id) => filter_var($id, FILTER_VALIDATE_INT), $seatIds);
if (in_array(false, $seatIds, true) || in_array(null, $seatIds, true) || min($seatIds) < 1 || count(array_unique($seatIds)) !== count($seatIds)) {
    respond(['error' => 'Invalid or duplicate seat IDs'], 422);
}

$cleanConcessions = [];
foreach ($concessions as $item) {
    $id = filter_var($item['concessionId'] ?? null, FILTER_VALIDATE_INT);
    $quantity = filter_var($item['quantity'] ?? null, FILTER_VALIDATE_INT);
    if ($id && $id > 0 && $quantity && $quantity > 0 && $quantity <= 50) {
        $cleanConcessions[$id] = ($cleanConcessions[$id] ?? 0) + $quantity;
    }
}

try {
    $pdo = db();
    $pdo->beginTransaction();

    $showStmt = $pdo->prepare("SELECT ShowtimeID, HallID, TicketPrice FROM Showtimes WITH (UPDLOCK, HOLDLOCK) WHERE ShowtimeID = ? AND Status = 'Scheduled' AND StartTime > SYSDATETIME()");
    $showStmt->execute([$showtimeId]);
    $show = $showStmt->fetch();
    if (!$show) { $pdo->rollBack(); respond(['error' => 'Showtime is unavailable'], 409); }

    $marks = implode(',', array_fill(0, count($seatIds), '?'));
    $seatStmt = $pdo->prepare("SELECT SeatID FROM Seats WHERE HallID = ? AND SeatID IN ($marks)");
    $seatStmt->execute(array_merge([$show['HallID']], $seatIds));
    if (count($seatStmt->fetchAll(PDO::FETCH_COLUMN)) !== count($seatIds)) {
        $pdo->rollBack(); respond(['error' => 'One or more seats are invalid'], 422);
    }

    $takenStmt = $pdo->prepare("SELECT SeatID FROM BookingSeats WITH (UPDLOCK, HOLDLOCK) WHERE ShowtimeID = ? AND SeatID IN ($marks)");
    $takenStmt->execute(array_merge([$showtimeId], $seatIds));
    if ($takenStmt->fetch()) { $pdo->rollBack(); respond(['error' => 'One or more seats have already been booked'], 409); }

    $ticketTotal = (float)$show['TicketPrice'] * count($seatIds);
    $concessionRows = [];
    $concessionTotal = 0.0;
    if ($cleanConcessions) {
        $ids = array_keys($cleanConcessions);
        $cmarks = implode(',', array_fill(0, count($ids), '?'));
        $cstmt = $pdo->prepare("SELECT ConcessionID, Name, Price FROM Concessions WHERE IsAvailable = 1 AND ConcessionID IN ($cmarks)");
        $cstmt->execute($ids);
        $rows = $cstmt->fetchAll();
        if (count($rows) !== count($ids)) { $pdo->rollBack(); respond(['error' => 'One or more concession items are unavailable'], 409); }
        foreach ($rows as $row) {
            $quantity = $cleanConcessions[(int)$row['ConcessionID']];
            $concessionTotal += (float)$row['Price'] * $quantity;
            $concessionRows[] = [$row['ConcessionID'], $quantity, $row['Price'], $row['Name']];
        }
    }
    $total = round($ticketTotal + $concessionTotal, 2);

    $bookingStmt = $pdo->prepare("INSERT INTO Bookings (CustomerName, CustomerEmail, CustomerPhone, ShowtimeID, TotalAmount, Status) OUTPUT INSERTED.BookingID, INSERTED.BookingCode VALUES (?, ?, ?, ?, ?, 'Confirmed')");
    $bookingStmt->execute([$name, $email, $phone, $showtimeId, $total]);
    $booking = $bookingStmt->fetch();

    $insertSeat = $pdo->prepare("INSERT INTO BookingSeats (BookingID, ShowtimeID, SeatID, TicketPrice) VALUES (?, ?, ?, ?)");
    foreach ($seatIds as $seatId) $insertSeat->execute([$booking['BookingID'], $showtimeId, $seatId, $show['TicketPrice']]);

    $insertConcession = $pdo->prepare("INSERT INTO BookingConcessions (BookingID, ConcessionID, Quantity, UnitPrice) VALUES (?, ?, ?, ?)");
    foreach ($concessionRows as [$id, $quantity, $price, $itemName]) $insertConcession->execute([$booking['BookingID'], $id, $quantity, $price]);

    $pdo->commit();
    respond(['message' => 'Booking confirmed', 'booking' => [
        'bookingCode' => $booking['BookingCode'], 'customerName' => $name, 'customerEmail' => $email,
        'customerPhone' => $phone, 'showtimeId' => $showtimeId, 'seatIds' => $seatIds,
        'concessions' => $concessionRows, 'totalAmount' => $total, 'status' => 'Confirmed'
    ]], 201);
} catch (PDOException $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    error_log($e->getMessage());
    if (in_array((int)($e->errorInfo[1] ?? 0), [2601, 2627], true)) respond(['error' => 'A selected seat was just booked. Please choose again.'], 409);
    respond(['error' => 'Booking could not be completed'], 500);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    error_log($e->getMessage());
    respond(['error' => 'Booking could not be completed'], 500);
}
