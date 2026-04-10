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
        Schema::table('bookings', function (Blueprint $table) {
            // Modify payment_status column if it exists, otherwise create it
            if (Schema::hasColumn('bookings', 'payment_status')) {
                // Drop existing column and recreate with new enum values
                $table->dropColumn('payment_status');
            }
        });
        
        Schema::table('bookings', function (Blueprint $table) {
            // Add payment_status column for tracking split payment progress
            $table->enum('payment_status', [
                'pending_deposit',
                'deposit_paid',
                'pending_final',
                'completed',
                'overdue'
            ])->nullable()->after('status');
            
            // Add payment_deadline for final payment (48 hours after service confirmation)
            if (!Schema::hasColumn('bookings', 'payment_deadline')) {
                $table->timestamp('payment_deadline')->nullable()->after('payment_due_at');
            }
            
            // Add service_confirmed_at timestamp (when customer confirms service completion)
            if (!Schema::hasColumn('bookings', 'service_confirmed_at')) {
                $table->timestamp('service_confirmed_at')->nullable()->after('completed_at');
            }
            
            // Add indexes for query performance
            $table->index('payment_status', 'idx_payment_status_split');
            $table->index('payment_deadline', 'idx_payment_deadline');
        });
        
        // Update existing bookings with paid_at to set payment_status = 'completed'
        DB::statement("
            UPDATE bookings 
            SET payment_status = 'completed'
            WHERE paid_at IS NOT NULL
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            // Drop indexes
            if (Schema::hasIndex('bookings', 'idx_payment_deadline')) {
                $table->dropIndex('idx_payment_deadline');
            }
            if (Schema::hasIndex('bookings', 'idx_payment_status_split')) {
                $table->dropIndex('idx_payment_status_split');
            }
            
            // Drop columns
            if (Schema::hasColumn('bookings', 'payment_deadline')) {
                $table->dropColumn('payment_deadline');
            }
            if (Schema::hasColumn('bookings', 'service_confirmed_at')) {
                $table->dropColumn('service_confirmed_at');
            }
            if (Schema::hasColumn('bookings', 'payment_status')) {
                $table->dropColumn('payment_status');
            }
        });
    }
};
