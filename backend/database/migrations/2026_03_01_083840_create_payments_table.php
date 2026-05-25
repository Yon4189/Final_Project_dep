<?php
// database/migrations/xxxx_create_payments_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreatePaymentsTable extends Migration
{
    public function up()
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id('paymentID');
            $table->unsignedBigInteger('bookingID');
            $table->unsignedBigInteger('customerID');
            $table->unsignedBigInteger('providerID');
            
            // Payment details
            $table->string('tx_ref')->unique(); // Chapa transaction reference
            $table->string('chapa_tx_id')->nullable(); // Chapa's transaction ID
            $table->decimal('amount', 10, 2); // Total amount paid by customer
            $table->decimal('platform_commission', 10, 2); // 10% of amount
            $table->decimal('provider_amount', 10, 2); // Amount after commission
            $table->string('currency')->default('ETB');
            
            // Status tracking
            $table->enum('status', [
                'pending',      // Initial state
                'paid',         // Customer paid, funds in escrow
                'held',         // Funds held in escrow
                'released',     // Released to provider after completion
                'refunded',     // Refunded to customer
                'partial_refund', // Partial refund (50% on day of service)
                'failed'        // Payment failed
            ])->default('pending');
            
            // Chapa payment URLs
            $table->string('checkout_url')->nullable(); // Chapa payment page
            $table->string('callback_url')->nullable();
            $table->string('return_url')->nullable();
            
            // Customer info at time of payment
            $table->string('customer_email');
            $table->string('customer_first_name');
            $table->string('customer_last_name');
            $table->string('customer_phone')->nullable();
            
            // Metadata
            $table->json('meta_data')->nullable();
            $table->string('failure_reason')->nullable();
            
            // Timestamps
            $table->timestamp('paid_at')->nullable();
            $table->timestamp('released_at')->nullable();
            $table->timestamp('refunded_at')->nullable();
            $table->timestamps();

            // Foreign keys
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

            // Indexes
            $table->index('tx_ref');
            $table->index('status');
            $table->index(['customerID', 'created_at']);
            $table->index(['providerID', 'created_at']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('payments');
    }
}