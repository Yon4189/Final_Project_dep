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
