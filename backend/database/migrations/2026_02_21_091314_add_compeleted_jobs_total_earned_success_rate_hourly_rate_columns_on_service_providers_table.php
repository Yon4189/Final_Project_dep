<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up()
{
    Schema::table('service_providers', function (Blueprint $table) {
        $table->integer('completed_jobs')->default(0)->after('is_online'); // total completed jobs
        $table->decimal('total_earned', 12, 2)->default(0)->after('completed_jobs'); // total earned money
        $table->decimal('success_rate', 5, 2)->default(0)->after('total_earned'); // success rate in percentage
        $table->decimal('hourly_rate', 10, 2)->nullable()->after('success_rate'); // default hourly rate
    });
}

    /**
     * Reverse the migrations.
     */
    public function down()
    {
    Schema::table('service_providers', function (Blueprint $table) {
        $table->dropColumn(['is_online', 'completed_jobs', 'total_earned', 'success_rate', 'hourly_rate']);
    });
    }
};
