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
        Schema::table('bookings', function (Blueprint $table) {
            if (!Schema::hasColumn('bookings', 'paid_at')) {
                $table->timestamp('paid_at')->nullable()->after('status');
            }
            if (!Schema::hasColumn('bookings', 'payment_due_at')) {
                $table->timestamp('payment_due_at')->nullable()->after('paid_at');
            }
            if (!Schema::hasColumn('bookings', 'platform_commission')) {
                $table->decimal('platform_commission', 10, 2)->nullable()->after('payment_due_at');
            }
            if (!Schema::hasColumn('bookings', 'provider_payout')) {
                $table->decimal('provider_payout', 10, 2)->nullable()->after('platform_commission');
            }
            if (!Schema::hasColumn('bookings', 'refund_amount')) {
                $table->decimal('refund_amount', 10, 2)->nullable()->after('provider_payout');
            }
            if (!Schema::hasColumn('bookings', 'released_at')) {
                $table->timestamp('released_at')->nullable()->after('refund_amount');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropColumn([
                'paid_at',
                'payment_due_at',
                'platform_commission',
                'provider_payout',
                'refund_amount',
                'released_at'
            ]);
        });
    }
};
