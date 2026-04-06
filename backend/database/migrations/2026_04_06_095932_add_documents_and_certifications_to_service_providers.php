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
            $table->string('business_license')->nullable()->after('credentialPhoto');
            $table->string('insurance_certificate')->nullable()->after('business_license');
            $table->json('certifications')->nullable()->after('insurance_certificate');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('service_providers', function (Blueprint $table) {
            $table->dropColumn(['business_license', 'insurance_certificate', 'certifications']);
        });
    }
};
