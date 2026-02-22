<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn(['service_latitude', 'service_longitude']);
        });
    }

    public function down()
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->decimal('service_latitude', 10, 7)->nullable();
            $table->decimal('service_longitude', 10, 7)->nullable();
        });
    }
};