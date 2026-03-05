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
        Schema::create('wallet_transactions', function (Blueprint $table) {
            $table->id('transactionID');
            $table->unsignedBigInteger('walletID');
            $table->enum('type', ['credit', 'debit', 'withdrawal']);
            $table->decimal('amount', 12, 2);
            $table->string('description')->nullable();
            $table->unsignedBigInteger('bookingID')->nullable();
            $table->unsignedBigInteger('withdrawalID')->nullable();
            $table->timestamps();

            $table->foreign('walletID')
                  ->references('walletID')
                  ->on('wallets')
                  ->onDelete('cascade');
                  
            $table->foreign('bookingID')
                  ->references('bookingID')
                  ->on('bookings')
                  ->onDelete('set null');
                  
            $table->foreign('withdrawalID')
                  ->references('withdrawalID')
                  ->on('withdrawals')
                  ->onDelete('set null');
            
            // Add indexes for better performance
            $table->index('walletID');
            $table->index('bookingID');
            $table->index('withdrawalID');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('wallet_transactions');
    }
};