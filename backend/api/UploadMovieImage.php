<?php
require_once __DIR__ . '/cors.php';
requireAdmin();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(['success' => false, 'error' => 'Method not allowed'], 405);
}

if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
    respond(['success' => false, 'error' => 'Please select an image file.'], 422);
}

$file = $_FILES['image'];
if ($file['size'] > 5 * 1024 * 1024) {
    respond(['success' => false, 'error' => 'Image must be 5 MB or smaller.'], 422);
}

$finfo = new finfo(FILEINFO_MIME_TYPE);
$mime = $finfo->file($file['tmp_name']);
$allowed = [
    'image/jpeg' => 'jpg',
    'image/png' => 'png',
    'image/webp' => 'webp',
    'image/gif' => 'gif',
];
if (!isset($allowed[$mime])) {
    respond(['success' => false, 'error' => 'Only JPG, PNG, WEBP, and GIF images are allowed.'], 422);
}

$uploadDir = dirname(__DIR__) . '/public/uploads/movies';
if (!is_dir($uploadDir) && !mkdir($uploadDir, 0775, true)) {
    respond(['success' => false, 'error' => 'Upload folder could not be created.'], 500);
}

$filename = bin2hex(random_bytes(16)) . '.' . $allowed[$mime];
$destination = $uploadDir . DIRECTORY_SEPARATOR . $filename;
if (!move_uploaded_file($file['tmp_name'], $destination)) {
    respond(['success' => false, 'error' => 'Image could not be saved. Check folder permissions.'], 500);
}

// SCRIPT_NAME is /<project>/backend/api/<file>.php, and uploads live in /<project>/backend/public/...
// so the backend root is TWO levels up.
$basePath = rtrim(dirname($_SERVER['SCRIPT_NAME'], 2), '/\\');
$relativeUrl = $basePath . '/public/uploads/movies/' . $filename;

// Vite serves the UI on a different origin/port from Apache. Returning an
// absolute PHP URL makes the uploaded preview work in both development and
// production, regardless of the frontend dev-server proxy.
$scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$host = $_SERVER['HTTP_HOST'] ?? '';
$url = $host !== '' ? $scheme . '://' . $host . $relativeUrl : $relativeUrl;
respond([
    'success' => true,
    'url' => $url,
    'filename' => $filename,
], 201);
