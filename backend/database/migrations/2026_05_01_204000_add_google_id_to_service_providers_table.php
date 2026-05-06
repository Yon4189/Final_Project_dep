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
        Schema::table('service_providers', function (Blueprint $table) {
            if (!Schema::hasColumn('service_providers', 'google_id')) {
                $table->string('google_id')->nullable()->unique()->after('email');
            }
            // profilePicture is usually already there, but let's check or add it if missing
            if (!Schema::hasColumn('service_providers', 'profilePicture')) {
                $table->string('profilePicture')->nullable()->after('password');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('service_providers', function (Blueprint $table) {
            $table->dropColumn(['google_id']);
        });
    }
};
