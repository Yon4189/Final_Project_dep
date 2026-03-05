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
            // Bank information fields
            $table->string('provider_bank_name')->nullable()->after('providerID');
            $table->string('provider_account_number')->nullable()->after('provider_bank_name');
            $table->string('provider_account_holder_name')->nullable()->after('provider_account_number');
            
            // Chapa integration fields
            $table->string('chapa_transfer_id')->nullable()->after('status');
            $table->string('chapa_transfer_status')->nullable()->after('chapa_transfer_id');
            
            // Financial fields
            $table->string('currency')->default('ETB')->after('amount');
            $table->decimal('platform_fee', 12, 2)->default(0)->after('amount');
            $table->decimal('net_amount', 12, 2)->default(0)->after('platform_fee');
            
            // Additional status fields (if you want more granular status)
            // $table->enum('detailed_status', ['pending', 'approved', 'rejected', 'processing', 'completed', 'failed', 'cancelled'])
            //       ->default('pending')
            //       ->after('status');
            
            // Failure tracking
            $table->text('failure_reason')->nullable()->after('admin_notes');
            
            // Completion timestamp
            $table->timestamp('completed_at')->nullable()->after('processed_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('withdrawals', function (Blueprint $table) {
            $table->dropColumn([
                'provider_bank_name',
                'provider_account_number',
                'provider_account_holder_name',
                'chapa_transfer_id',
                'chapa_transfer_status',
                'currency',
                'platform_fee',
                'net_amount',
                'failure_reason',
                'completed_at'
            ]);
        });
    }
};