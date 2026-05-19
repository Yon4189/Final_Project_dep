<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "<h1>PHP Database Test</h1>";

$host = getenv('DB_HOST');
$port = getenv('DB_PORT') ?: '3306';
$user = getenv('DB_USERNAME');
$pass = getenv('DB_PASSWORD');
$db   = getenv('DB_DATABASE');

echo "<b>Host:</b> $host<br>";
echo "<b>Port:</b> $port<br>";
echo "<b>User:</b> $user<br>";
echo "<b>Database:</b> $db<br><br>";

try {
    $dsn = "mysql:host=$host;port=$port;dbname=$db;charset=utf8mb4";
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT => false,
    ];
    
    $pdo = new PDO($dsn, $user, $pass, $options);
    echo "<h2 style='color:green'>✅ SUCCESS: Connected to TiDB database!</h2>";
    
    $stmt = $pdo->query("SELECT VERSION() as version");
    $row = $stmt->fetch();
    echo "<b>TiDB Version:</b> " . $row['version'];

} catch (\PDOException $e) {
    echo "<h2 style='color:red'>❌ ERROR: Could not connect!</h2>";
    echo "<pre>" . $e->getMessage() . "</pre>";
}
