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
        Schema::create('provider_trackings', function (Blueprint $table) {
            $table->id('trackingID');
            $table->unsignedBigInteger('providerID');
            $table->unsignedBigInteger('bookingID');
            $table->decimal('latitude', 10, 8);
            $table->decimal('longitude', 11, 8);
            $table->float('speed')->nullable();
            $table->float('heading')->nullable();
            $table->timestamp('tracked_at');
            $table->timestamps();
            
            // Foreign keys
            $table->foreign('providerID')
                  ->references('providerID')
                  ->on('service_providers')
                  ->onDelete('cascade');
                  
            $table->foreign('bookingID')
                  ->references('bookingID')
                  ->on('bookings')
                  ->onDelete('cascade');
            
            // Indexes for performance
            $table->index(['providerID', 'bookingID']);
            $table->index('tracked_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('provider_trackings');
    }
};