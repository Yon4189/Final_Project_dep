<?php
// One-time script to create admin user in Railway database
// Run with: php create-admin-railway.php
// DELETE THIS FILE AFTER USE!

$host = 'autorack.proxy.rlwy.net';
$port = 55476;
$database = 'railway';
$username = 'root';
$password = 'ZeueIgGbwjzTIbuEOEmPVGVVbVUrKgHI';

try {
    $dsn = "mysql:host=$host;port=$port;dbname=$database;charset=utf8mb4";
    $pdo = new PDO($dsn, $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    
    echo "Connected to Railway database successfully!\n";
    
    // Check if admin already exists
    $stmt = $pdo->prepare("SELECT * FROM admins WHERE email = ?");
    $stmt->execute(['admin@gmail.com']);
    
    if ($stmt->fetch()) {
        echo "Admin user already exists with email: admin@gmail.com\n";
        exit(0);
    }
    
    // Create admin user
    $hashedPassword = '$2y$12$LQv3c1yduTi6xUrfkIfucu6vWGZjn5RqelYs3mFihidFDhrgK.maa';
    $stmt = $pdo->prepare("
        INSERT INTO admins (name, email, password, created_at, updated_at) 
        VALUES (?, ?, ?, NOW(), NOW())
    ");
    
    $stmt->execute(['Admin', 'admin@gmail.com', $hashedPassword]);
    
    echo "✓ Admin user created successfully!\n";
    echo "  Email: admin@gmail.com\n";
    echo "  Password: admin12345\n";
    echo "\n";
    echo "⚠️  IMPORTANT: Delete this file (create-admin-railway.php) now for security!\n";
    
} catch (PDOException $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    exit(1);
}
