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
            // Add columns if they do not exist
            if (!Schema::hasColumn('bookings', 'payment_status')) {
                $table->string('payment_status')->nullable()->after('status');
            }
            if (!Schema::hasColumn('bookings', 'auto_release_at')) {
                $table->timestamp('auto_release_at')->nullable()->after('payment_status');
            }
            if (!Schema::hasColumn('bookings', 'customer_confirmed_at')) {
                $table->timestamp('customer_confirmed_at')->nullable()->after('auto_release_at');
            }
            if (!Schema::hasColumn('bookings', 'pending_balance')) {
                $table->decimal('pending_balance', 12, 2)->default(0);
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            if (Schema::hasColumn('bookings', 'payment_status')) {
                $table->dropColumn('payment_status');
            }
            if (Schema::hasColumn('bookings', 'auto_release_at')) {
                $table->dropColumn('auto_release_at');
            }
            if (Schema::hasColumn('bookings', 'customer_confirmed_at')) {
                $table->dropColumn('customer_confirmed_at');
            }
            if (Schema::hasColumn('bookings', 'pending_balance')) {
                $table->dropColumn('pending_balance');
            }
        });
    }
};
