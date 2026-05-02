<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

try {
    if (!Schema::hasColumn('customers', 'walletBalance')) {
        Schema::table('customers', function (Blueprint $table) {
            $table->decimal('walletBalance', 15, 2)->default(0);
        });
        echo "Successfully added walletBalance to customers table.\n";
    } else {
        echo "Column walletBalance already exists on customers table.\n";
    }
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
