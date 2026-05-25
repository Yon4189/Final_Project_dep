<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('service_providers', function (Blueprint $table) {
            $table->boolean('isVerified')->nullable()->default(null)->change();
        });
    }

    public function down()
    {
        Schema::table('service_providers', function (Blueprint $table) {
            $table->boolean('isVerified')->nullable(false)->default(0)->change();
        });
    }
};