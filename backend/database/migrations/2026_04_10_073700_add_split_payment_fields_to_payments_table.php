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
        Schema::table('payments', function (Blueprint $table) {
            // Add payment_type column
            $table->enum('payment_type', ['deposit', 'final'])->default('final')->after('amount');
            
            // Add payment_phase column (for additional context if needed)
            $table->string('payment_phase', 50)->nullable()->after('payment_type');
            
            // Add payment_status column (separate from Chapa status)
            $table->enum('payment_status', ['pending', 'completed', 'failed', 'refunded'])->default('pending')->after('status');
            
            // Add indexes for query performance
            $table->index('payment_type', 'idx_payment_type');
            $table->index('payment_status', 'idx_payment_status');
            $table->index(['bookingID', 'payment_type'], 'idx_booking_payment');
        });
        
        // Update existing payments to set payment_type = 'final' and payment_status based on current status
        DB::statement("
            UPDATE payments 
            SET payment_type = 'final',
                payment_status = CASE
                    WHEN status = 'paid' OR status = 'released' THEN 'completed'
                    WHEN status = 'pending' THEN 'pending'
                    WHEN status = 'failed' THEN 'failed'
                    WHEN status = 'refunded' OR status = 'partial_refund' THEN 'refunded'
                    ELSE 'pending'
                END
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            // Drop indexes
            $table->dropIndex('idx_booking_payment');
            $table->dropIndex('idx_payment_status');
            $table->dropIndex('idx_payment_type');
            
            // Drop columns
            $table->dropColumn(['payment_type', 'payment_phase', 'payment_status']);
        });
    }
};
