<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Mail;
use App\Jobs\TestJob;

Route::get('/', function () {
    return view('welcome');


});

Route::get('/test-job', function () {
    TestJob::dispatch();
    return "Job dispatched!";
});
Route::get('/test-email', function () {
    Mail::raw('Test email from Laravel', function ($message) {
            $message->to('yacobnati@gmail.com')
                ->subject('Laravel Email Test');
        }
        );

        return 'Email sent';    });
Route::get('/fix-database', function () {
    try {
        // Check if column exists using raw query for maximum compatibility
        $columns = Illuminate\Support\Facades\DB::select("SHOW COLUMNS FROM customers LIKE 'walletBalance'");
        
        if (empty($columns)) {
            Illuminate\Support\Facades\DB::statement("ALTER TABLE customers ADD COLUMN walletBalance DECIMAL(15,2) DEFAULT 0 AFTER profilePicture");
            return "Successfully added walletBalance to customers table using raw SQL.";
        } else {
            return "Column walletBalance already exists on customers table.";
        }
    } catch (\Exception $e) {
        return "Error: " . $e->getMessage();
    }
});

Route::get('/check-columns', function() {
    return Illuminate\Support\Facades\Schema::getColumnListing('customers');
});

