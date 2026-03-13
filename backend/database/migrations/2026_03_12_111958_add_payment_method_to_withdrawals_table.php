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
        Schema::table('withdrawals', function (Blueprint $table) {
            // Add payment method column
            if (!Schema::hasColumn('withdrawals', 'payment_method')) {
                $table->string('payment_method')->nullable()->after('net_amount');
            }
            
            // Add telebir columns
            if (!Schema::hasColumn('withdrawals', 'telebir_number')) {
                $table->string('telebir_number')->nullable()->after('provider_account_holder_name');
            }
            
            if (!Schema::hasColumn('withdrawals', 'telebir_holder_name')) {
                $table->string('telebir_holder_name')->nullable()->after('telebir_number');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('withdrawals', function (Blueprint $table) {
            $table->dropColumn([
                'payment_method',
                'telebir_number',
                'telebir_holder_name'
            ]);
        });
    }
};