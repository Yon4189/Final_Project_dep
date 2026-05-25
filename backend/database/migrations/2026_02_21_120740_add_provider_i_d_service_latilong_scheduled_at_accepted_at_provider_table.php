<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
        public function up()
    {
        Schema::table('bookings', function (Blueprint $table) {
            // Provider assigned to booking
            $table->unsignedBigInteger('providerID')->nullable()->after('serviceID');

            // Service location for this booking (can differ from customer's home)
            $table->decimal('service_latitude', 10, 8)->nullable()->after('providerID');
            $table->decimal('service_longitude', 11, 8)->nullable()->after('service_latitude');

            // ETA system
            $table->integer('eta_minutes')->nullable()->after('service_longitude');
            $table->timestamp('estimated_arrival_time')->nullable()->after('eta_minutes');

            // Tracking timestamps
            $table->timestamp('accepted_at')->nullable()->after('status');
            $table->timestamp('provider_started_at')->nullable()->after('accepted_at');
            $table->timestamp('provider_arrived_at')->nullable()->after('provider_started_at');
            $table->timestamp('completed_at')->nullable()->after('provider_arrived_at');
        });
    }

    public function down()
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropColumn([
                'providerID',
                'service_latitude',
                'service_longitude',
                'eta_minutes',
                'estimated_arrival_time',
                'accepted_at',
                'provider_started_at',
                'provider_arrived_at',
                'completed_at'
            ]);
        });
    }

};


