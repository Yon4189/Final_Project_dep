<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('serviceproviders', function (Blueprint $table) {
            $table->string('idPhotoType')->nullable()->after('idPhoto');
        });
    }

    public function down(): void
    {
        Schema::table('serviceproviders', function (Blueprint $table) {
            $table->dropColumn('idPhotoType');
        });
    }
};