<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit("Run this script from the command line only.\n");
}

require_once __DIR__ . '/connect.php';

$username = trim(readline('Admin username: '));
$fullName = trim(readline('Admin full name: '));

if ($username === '' || $fullName === '') {
    exit("Username and full name are required.\n");
}

echo "Admin password: ";
if (PHP_OS_FAMILY === 'Windows') {
    // Windows CLI does not support the same portable hidden input
    // as Unix terminals. Enter the password at the prompt.
    $password = trim(fgets(STDIN));
} else {
    system('stty -echo');
    $password = trim(fgets(STDIN));
    system('stty echo');
    echo PHP_EOL;
}

if (strlen($password) < 8) {
    exit("Use a password of at least 8 characters.\n");
}

$stmt = $conn->prepare("
    INSERT INTO dbo.AdminUsers
        (Username, PasswordHash, DisplayName, Role, IsActive)
    VALUES (?, ?, ?, 'admin', 1)
");


try {
    $stmt->execute([
        $username,
        password_hash($password, PASSWORD_DEFAULT),
        $fullName
    ]);

    echo "Admin account created successfully.\n";
} catch (PDOException $e) {
    fwrite(STDERR, "Could not create admin. The username may already exist.\n");
    exit(1);
}
