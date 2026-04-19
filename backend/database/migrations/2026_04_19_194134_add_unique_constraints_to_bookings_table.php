<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Prevent two providers from accepting the same booking,
     * and prevent a customer from having two active bookings
     * for the same provider+service on the same day.
     */
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            // Prevent duplicate active bookings: same customer + provider + service + date
            // Only one pending/accepted booking per customer-provider-service-date combo
            $table->index(['customerID', 'providerID', 'serviceID', 'status'], 'idx_booking_active_combo');
        });

        Schema::table('payments', function (Blueprint $table) {
            // Prevent duplicate payment records for the same tx_ref
            // tx_ref is already unique per Chapa, enforce it at DB level too
            $table->unique('tx_ref', 'uq_payments_tx_ref');
        });
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropIndex('idx_booking_active_combo');
        });

        Schema::table('payments', function (Blueprint $table) {
            $table->dropUnique('uq_payments_tx_ref');
        });
    }
};
