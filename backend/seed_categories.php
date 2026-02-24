<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$categories = [
    ['catagoryID' => 1, 'name' => 'Plumbing'],
    ['catagoryID' => 2, 'name' => 'Home Cleaning'],
    ['catagoryID' => 3, 'name' => 'Electrical Services'],
    ['catagoryID' => 4, 'name' => 'Internet & TV Setup'],
    ['catagoryID' => 5, 'name' => 'Painting & Finishing'],
    ['catagoryID' => 6, 'name' => 'Carpentry'],
    ['catagoryID' => 7, 'name' => 'AC & Home Appliances'],
    ['catagoryID' => 8, 'name' => 'Home Maintenance'],
];

try {
    echo "Checking catagories table...\n";
    if (!Schema::hasTable('catagories')) {
        echo "Table 'catagories' does not exist!\n";
        exit(1);
    }

    echo "Inserting categories...\n";
    foreach ($categories as $cat) {
        // Use updateOrInsert to avoid duplicate key errors if some already exist
        DB::table('catagories')->updateOrInsert(
            ['catagoryID' => $cat['catagoryID']],
            ['name' => $cat['name']]
        );
        echo "Upserted: {$cat['name']} (ID: {$cat['catagoryID']})\n";
    }

    echo "Done! Current count: " . DB::table('catagories')->count() . "\n";
} catch (\Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    exit(1);
}
