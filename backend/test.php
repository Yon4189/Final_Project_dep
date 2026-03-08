<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$custs = App\Models\Customer::select('customerID', 'profilePicture')->take(2)->get();
echo "Customers:\n";
foreach ($custs as $c) {
    echo "ID: " . $c->customerID . " -> " . ($c->profilePicture ?? 'null') . "\n";
}

$provs = App\Models\ServiceProvider::select('providerID', 'profilePicture')->take(2)->get();
echo "\nProviders:\n";
foreach ($provs as $p) {
    echo "ID: " . $p->providerID . " -> " . ($p->profilePicture ?? 'null') . "\n";
}
