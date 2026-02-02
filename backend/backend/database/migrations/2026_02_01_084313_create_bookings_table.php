<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bookings', function (Blueprint $table) {
            $table->id('bookingID');

            $table->unsignedBigInteger('customerID');
            $table->unsignedBigInteger('serviceID');

            $table->string('status')->default('pending');
            $table->timestamp('scheduledDate')->nullable();

            $table->timestamps();

            $table->foreign('customerID')
                  ->references('customerID')
                  ->on('customers')
                  ->onDelete('cascade');

            $table->foreign('serviceID')
                  ->references('serviceID')
                  ->on('services')
                  ->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bookings');
    }
};
