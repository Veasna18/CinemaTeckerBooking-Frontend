<?php

require_once __DIR__ . '/config.php';

function db( ): PDO
{
    static $connection;

    if ($connection instanceof PDO) {
        return $connection;
    }

    if (!extension_loaded('pdo_sqlsrv')) {
        throw new RuntimeException(
            'pdo_sqlsrv is not enabled in the PHP used by Laragon.'
        );
    }

    $dsn =
        'sqlsrv:Server=' . DB_HOST .
        ';Database=' . DB_NAME .
        ';TrustServerCertificate=1' .
        ';LoginTimeout=5';

    try {
        $connection = new PDO(
            $dsn,
            null,
            null,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]
        );

        return $connection;
    } catch (Throwable $e) {
        error_log('CinemaTaket SQL connection error: ' . $e->getMessage());

        throw new RuntimeException(
            'SQL Server connection failed: ' . $e->getMessage(),
            0,
            $e
        );
    }
}

try {
    $conn = db();
} catch (Throwable $e) {
    http_response_code(500 );
    header('Content-Type: application/json; charset=utf-8');

    echo json_encode([
        'success' => false,
        'error' => 'SQL Server connection failed.',
        'details' => $e->getMessage(),
    ]);

    exit;
}
