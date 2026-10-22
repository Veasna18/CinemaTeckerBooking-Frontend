<?php
// declare(strict_types=1);

require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/connect.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    header('Allow: GET, OPTIONS');
    respond(['error' => 'Method not allowed'], 405);
}

try {
    $pdo = db();

    // Optional query parameters
    $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
    $search = trim((string)($_GET['search'] ?? ''));
    $genre = trim((string)($_GET['genre'] ?? ''));

    if ($id !== null && $id !== false && $id < 1) {
        respond(['error' => 'Invalid movie ID'], 400);
    }

    if (mb_strlen($search) > 100 || mb_strlen($genre) > 80) {
        respond(['error' => 'Search parameters are too long'], 400);
    }

    // Retrieve one movie by ID
    if ($id !== null && $id !== false) {
        $stmt = $pdo->prepare(
            "SELECT
                MovieID,
                Title,
                Description,
                Genre,
                DurationMinutes,
                Rating,
                PosterURL,
                BannerURL,
                ReleaseDate,
                Origin
             FROM Movies
             WHERE MovieID = ?
               AND IsActive = 1"
        );

        $stmt->execute([$id]);
        $movie = $stmt->fetch();

        if (!$movie) {
            respond(['error' => 'Movie not found'], 404);
        }

        respond(['movie' => $movie]);
    }

    // Retrieve all movies, with optional search and genre filters
    $sql = "
        SELECT
            MovieID,
            Title,
            Description,
            Genre,
            DurationMinutes,
            Rating,
            PosterURL,
            BannerURL,
            ReleaseDate,
            Origin
        FROM Movies
        WHERE IsActive = 1
    ";

    $params = [];

    if ($search !== '') {
        $sql .= " AND Title LIKE ?";
        $params[] = '%' . $search . '%';
    }

    if ($genre !== '' && strcasecmp($genre, 'All') !== 0) {
        $sql .= " AND Genre = ?";
        $params[] = $genre;
    }

    $sql .= " ORDER BY ReleaseDate DESC, Title ASC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    $movies = $stmt->fetchAll();

    respond([
        'success' => true,
        'count' => count($movies),
        'movies' => $movies
    ]);

} catch (PDOException $e) {
    error_log($e->getMessage());

    respond([
        'success' => false,
        'error' => 'Unable to retrieve movies from the database'
    ], 500);
} catch (Throwable $e) {
    error_log($e->getMessage());

    respond([
        'success' => false,
        'error' => 'An unexpected server error occurred'
    ], 500);
}