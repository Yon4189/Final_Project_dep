<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('service_providers', function (Blueprint $table) {
            // Rating fields
            $table->decimal('average_rating', 3, 2)->default(0)->after('is_online');
            $table->integer('total_reviews')->default(0)->after('average_rating');
            
            // Bank/Telebir withdrawal fields
            $table->string('bank_name')->nullable()->after('total_reviews');
            $table->string('account_number')->nullable()->after('bank_name');
            $table->string('account_holder_name')->nullable()->after('account_number');
            $table->string('telebir_number')->nullable()->after('account_holder_name');
            $table->string('telebir_holder_name')->nullable()->after('telebir_number');
            $table->enum('preferred_payout_method', ['bank', 'telebir'])->default('bank')->after('telebir_holder_name');
            $table->timestamp('last_withdrawal_at')->nullable()->after('preferred_payout_method');
        });
    }

    public function down(): void
    {
        Schema::table('service_providers', function (Blueprint $table) {
            // Drop rating fields
            $table->dropColumn(['average_rating', 'total_reviews']);
            
            // Drop withdrawal fields
            $table->dropColumn([
                'bank_name', 
                'account_number', 
                'account_holder_name',
                'telebir_number',
                'telebir_holder_name',
                'preferred_payout_method',
                'last_withdrawal_at'
            ]);
        });
    }
};