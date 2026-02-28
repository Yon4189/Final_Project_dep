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
        Schema::create('payments', function (Blueprint $table) {
            $table->id('paymentID');

            $table->unsignedBigInteger('bookingID');
            $table->unsignedBigInteger('customerID');
            $table->unsignedBigInteger('providerID');

            $table->decimal('amount', 10, 2); // Full amount paid by customer
            $table->decimal('platform_commission', 10, 2); // 10% commission

            $table->enum('status', ['held', 'released', 'refunded'])
                  ->default('held');

            $table->timestamp('released_at')->nullable();

            $table->timestamps();

            // Foreign Keys
            $table->foreign('bookingID')
                  ->references('bookingID')
                  ->on('bookings')
                  ->onDelete('cascade');

            $table->foreign('customerID')
                  ->references('customerID')
                  ->on('customers')
                  ->onDelete('cascade');

            $table->foreign('providerID')
                  ->references('providerID')
                  ->on('service_providers')
                  ->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};