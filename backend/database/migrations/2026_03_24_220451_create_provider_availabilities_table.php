<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('provider_availabilities', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('providerID');
            $table->tinyInteger('day_of_week')->comment('0=Sun, 1=Mon, ..., 6=Sat');
            $table->time('start_time')->default('08:00:00');
            $table->time('end_time')->default('17:00:00');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->foreign('providerID')
                  ->references('providerID')
                  ->on('service_providers')
                  ->onDelete('cascade');
                  
            // A provider can only have one schedule configuration per day of week
            $table->unique(['providerID', 'day_of_week']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('provider_availabilities');
    }
};
