<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$custs = App\Models\Customer::select('customerID', 'fullname', 'profilePicture')->take(10)->get();
echo "Customers:\n";
foreach ($custs as $c) {
    echo "ID: " . $c->customerID . " Name: " . $c->fullname . " -> " . ($c->profilePicture ?? 'null') . "\n";
}

$provs = App\Models\ServiceProvider::select('providerID', 'fullname', 'profilePicture')->take(10)->get();
echo "\nProviders:\n";
foreach ($provs as $p) {
    echo "ID: " . $p->providerID . " Name: " . $p->fullname . " -> " . ($p->profilePicture ?? 'null') . "\n";
}
