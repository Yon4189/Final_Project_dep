<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
public function up(): void
{
    Schema::table('service_providers', function (Blueprint $table) {
        // We make it nullable so old accounts don't crash
        $table->string('credentialPhoto')->nullable()->after('idPhoto');
    });
}

public function down(): void
{
    Schema::table('service_providers', function (Blueprint $table) {
        $table->dropColumn('credentialPhoto');
    });
}
};
