<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('services', function (Blueprint $table) {
            // Remove old column
            $table->dropColumn('estimatedCost');

            // Add new columns
            $table->decimal('estimatedPrice', 10, 2)->after('description'); // adjust type/precision if needed
            $table->decimal('hourly_rate', 10, 2)->nullable()->after('estimatedPrice');
        });
    }

    public function down()
    {
        Schema::table('services', function (Blueprint $table) {
            $table->decimal('estimatedCost', 10, 2)->after('description');
            $table->dropColumn(['estimatedPrice', 'hourly_rate']);
        });
    }
};