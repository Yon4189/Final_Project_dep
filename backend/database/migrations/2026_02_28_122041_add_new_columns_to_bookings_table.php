<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    // database/migrations/xxxx_add_booking_fields.php
    public function up()
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->decimal('agreed_price', 10, 2)->after('service_longitude');
            $table->timestamp('expires_at')->nullable()->after('agreed_price');
            $table->timestamp('rejected_at')->nullable()->after('expires_at');
            $table->string('rejected_by')->nullable()->after('rejected_at'); // 'provider' or 'system'
            $table->string('rejection_reason')->nullable()->after('rejected_by');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            //
        });
    }
};
