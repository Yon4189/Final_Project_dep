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
        // Add to service_providers table
        Schema::table('service_providers', function (Blueprint $table) {
            $table->timestamp('last_seen_at')->nullable()->after('is_online');
        });
        
        // Add to customers table
        Schema::table('customers', function (Blueprint $table) {
            $table->boolean('is_online')->default(false)->after('status');
            $table->timestamp('last_seen_at')->nullable()->after('is_online');
        });
    }

    public function down(): void
    {
        Schema::table('service_providers', function (Blueprint $table) {
            $table->dropColumn(['last_seen_at']);
        });
        
        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn(['is_online', 'last_seen_at']);
        });
    }
};
