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
        Schema::table('customers', function (Blueprint $table) {
            $table->string('expo_push_token')->nullable()->after('email');
        });

        Schema::table('service_providers', function (Blueprint $table) {
            $table->string('expo_push_token')->nullable()->after('email');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn('expo_push_token');
        });

        Schema::table('service_providers', function (Blueprint $table) {
            $table->dropColumn('expo_push_token');
        });
    }
};
