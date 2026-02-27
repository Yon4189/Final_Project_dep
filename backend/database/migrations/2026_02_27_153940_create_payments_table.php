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
            $table->id();
            $table->string('tx_ref')->unique(); // Chapa transaction reference
            $table->string('chapa_tx_id')->nullable(); // Chapa transaction ID
            $table->decimal('amount', 10, 2);
            $table->string('currency', 3)->default('ETB');
            $table->string('status')->default('pending'); // pending, success, failed, cancelled
            $table->string('payment_method')->nullable(); // telebirr, cbe-birr, etc.
            
            // Customer information
            $table->string('customer_email');
            $table->string('customer_first_name');
            $table->string('customer_last_name');
            $table->string('customer_phone')->nullable();
            
            // Relationships
            $table->unsignedBigInteger('customer_id')->nullable(); // Link to customer
            $table->unsignedBigInteger('booking_id')->nullable(); // Link to booking if applicable
            
            // Chapa specific fields
            $table->string('checkout_url')->nullable();
            $table->string('callback_url')->nullable();
            $table->string('return_url')->nullable();
            
            // Metadata
            $table->json('meta_data')->nullable(); // Additional payment metadata
            $table->text('failure_reason')->nullable();
            
            $table->timestamps();
            
            // Indexes
            $table->index('tx_ref');
            $table->index('status');
            $table->index('customer_id');
            $table->index('booking_id');
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
