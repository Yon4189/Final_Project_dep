<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('wallet_transactions', function (Blueprint $table) {
            // Add transaction_type for categorizing transactions
            $table->enum('transaction_type', [
                'immediate_payout',
                'held_payout',
                'withdrawal',
                'refund_reversal',
                'other'
            ])->default('other')->after('type');
            
            // Add release_date for held payouts (when they become available)
            $table->timestamp('release_date')->nullable()->after('created_at');
            
            // Add transaction_status for tracking held payouts
            $table->enum('transaction_status', ['pending', 'completed', 'cancelled'])->default('completed')->after('transaction_type');
            
            // Add related_payment_id to link transactions to payments
            $table->unsignedBigInteger('related_payment_id')->nullable()->after('bookingID');
            
            // Add indexes for query performance
            $table->index('transaction_type', 'idx_transaction_type');
            $table->index('transaction_status', 'idx_transaction_status');
            $table->index('release_date', 'idx_release_date');
        });
        
        // Update existing transactions to set transaction_type = 'other'
        DB::statement("
            UPDATE wallet_transactions 
            SET transaction_type = 'other',
                transaction_status = 'completed'
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('wallet_transactions', function (Blueprint $table) {
            // Drop indexes
            $table->dropIndex('idx_release_date');
            $table->dropIndex('idx_transaction_status');
            $table->dropIndex('idx_transaction_type');
            
            // Drop columns
            $table->dropColumn(['transaction_type', 'release_date', 'transaction_status', 'related_payment_id']);
        });
    }
};
