<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('service_providers', function (Blueprint $table) {
            // is_available = provider manually set themselves as accepting jobs
            // (separate from is_online which tracks app liveness via heartbeat)
            $table->boolean('is_available')->default(true)->after('is_online');
        });
    }

    public function down(): void
    {
        Schema::table('service_providers', function (Blueprint $table) {
            $table->dropColumn('is_available');
        });
    }
};
