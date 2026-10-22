<?php
// declare(strict_types=1);

require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/connect.php';

$method = $_SERVER['REQUEST_METHOD'];

if (!in_array($method, ['GET', 'POST'], true)) {
    header('Allow: GET, POST, OPTIONS');
    adminResponse(['error' => 'Method not allowed'], 405);
}

requireAdmin();

try {
    $pdo = db();

    if ($method === 'GET') {
        $stmt = $pdo->query(
            "SELECT MovieID, Title, Description, Genre,
                    DurationMinutes, Rating, PosterURL, BannerURL,
                    ReleaseDate, Origin, IsActive
             FROM dbo.Movies
             ORDER BY MovieID DESC"
        );

        adminResponse([
            'success' => true,
            'movies' => $stmt->fetchAll(),
        ]);
    }

    $input = readJson();
    $action = $input['action'] ?? '';

    if ($action === 'delete') {
        $id = filter_var($input['movieId'] ?? null, FILTER_VALIDATE_INT);

        if (!$id || $id < 1) {
            adminResponse(['error' => 'Invalid movie ID'], 422);
        }

        // Preserve booking history and foreign-key relationships.
        $stmt = $pdo->prepare(
            "UPDATE dbo.Movies SET IsActive = 0 WHERE MovieID = ?"
        );
        $stmt->execute([$id]);

        if ($stmt->rowCount() === 0) {
            adminResponse(['error' => 'Movie not found or already inactive'], 404);
        }

        adminResponse(['success' => true, 'message' => 'Movie deleted from the catalogue']);
    }

    $id = filter_var($input['movieId'] ?? null, FILTER_VALIDATE_INT);
    $title = trim((string) ($input['title'] ?? ''));
    $description = trim((string) ($input['description'] ?? ''));
    $genre = trim((string) ($input['genre'] ?? ''));
    $duration = filter_var($input['durationMinutes'] ?? null, FILTER_VALIDATE_INT);
    $rating = trim((string) ($input['rating'] ?? ''));
    $poster = trim((string) ($input['posterURL'] ?? ''));
    $banner = trim((string) ($input['bannerURL'] ?? ''));
    $release = $input['releaseDate'] ?? null;
    $origin = trim((string) ($input['origin'] ?? ''));
    $active = filter_var(
        $input['isActive'] ?? true,
        FILTER_VALIDATE_BOOLEAN,
        FILTER_NULL_ON_FAILURE
    );

    if (
        $title === '' ||
        mb_strlen($title) > 150 ||
        mb_strlen($description) > 10000 ||
        mb_strlen($genre) > 80 ||
        !$duration ||
        $duration < 1 ||
        $duration > 1000 ||
        mb_strlen($rating) > 20 ||
        mb_strlen($poster) > 500 ||
        mb_strlen($banner) > 500 ||
        !in_array($origin, ['', 'Hollywood', 'China', 'Korea', 'Khmer'], true) ||
        $active === null
    ) {
        adminResponse(['error' => 'Please check the movie details'], 422);
    }

    foreach ([$poster, $banner] as $url) {
        // The project folder may be named CinemaTaket, CinemaTaket-fixed-v8,
        // etc. Validate uploads by their safe public directory instead of
        // hard-coding one project name.
        $urlPath = (string) parse_url($url, PHP_URL_PATH);
        $localUpload = str_starts_with($urlPath, '/')
            && str_contains($urlPath, '/public/uploads/movies/')
            && !str_contains($urlPath, '..')
            && (bool) preg_match('#/public/uploads/movies/[A-Za-z0-9._-]+$#', $urlPath);
        if ($url !== '' && !filter_var($url, FILTER_VALIDATE_URL) && !$localUpload) {
            adminResponse(['error' => 'Poster and banner must be valid URLs'], 422);
        }

        if ($url !== '' && !$localUpload && !in_array(
            strtolower((string) parse_url($url, PHP_URL_SCHEME)),
            ['http', 'https'],
            true
        )) {
            adminResponse(['error' => 'Only HTTP and HTTPS image URLs are allowed'], 422);
        }
    }

    if ($release !== null && $release !== '') {
        $date = DateTime::createFromFormat('!Y-m-d', (string) $release);
        if (!$date || $date->format('Y-m-d') !== $release) {
            adminResponse(['error' => 'Invalid release date'], 422);
        }
    } else {
        $release = null;
    }

    $params = [
        $title,
        $description !== '' ? $description : null,
        $genre !== '' ? $genre : null,
        $duration,
        $rating !== '' ? $rating : null,
        $poster !== '' ? $poster : null,
        $banner !== '' ? $banner : null,
        $release,
        $origin !== '' ? $origin : null,
        $active ? 1 : 0,
    ];

    if ($action === 'create') {
        $stmt = $pdo->prepare(
            "INSERT INTO dbo.Movies
                (Title, Description, Genre, DurationMinutes, Rating,
                 PosterURL, BannerURL, ReleaseDate, Origin, IsActive)
             OUTPUT INSERTED.MovieID
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        );

        $stmt->execute($params);
        $movieId = (int) $stmt->fetchColumn();

        adminResponse([
            'success' => true,
            'movieId' => $movieId,
            'message' => 'Movie created',
        ], 201);
    }

    if ($action === 'update') {
        if (!$id || $id < 1) {
            adminResponse(['error' => 'Valid movie ID required'], 422);
        }

        $stmt = $pdo->prepare(
            "UPDATE dbo.Movies SET
                Title = ?, Description = ?, Genre = ?,
                DurationMinutes = ?, Rating = ?, PosterURL = ?,
                BannerURL = ?, ReleaseDate = ?, Origin = ?, IsActive = ?
             WHERE MovieID = ?"
        );

        $stmt->execute([...$params, $id]);

        if ($stmt->rowCount() === 0) {
            $check = $pdo->prepare(
                "SELECT MovieID FROM dbo.Movies WHERE MovieID = ?"
            );
            $check->execute([$id]);

            if (!$check->fetch()) {
                adminResponse(['error' => 'Movie not found'], 404);
            }
        }

        adminResponse(['success' => true, 'message' => 'Movie updated']);
    }

    adminResponse(['error' => 'Unknown action'], 422);
} catch (Throwable $e) {
    error_log($e->getMessage());

    // Keep production responses generic, but expose the real exception during
    // local development so SQL/PHP configuration problems can be fixed.
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $isLocal = (bool) preg_match('#^https?://(localhost|127\.0\.0\.1)(:\d+)?$#i', $origin);
    $response = ['error' => 'Movie operation failed'];
    if ($isLocal) {
        $response['details'] = $e->getMessage();
    }

    adminResponse($response, 500);
}
