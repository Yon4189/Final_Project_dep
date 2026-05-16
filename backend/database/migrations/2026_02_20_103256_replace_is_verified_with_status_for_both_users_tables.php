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
    Schema::table('customers', function (Blueprint $table) {
        if (Schema::hasColumn('customers', 'isVerified')) {
            $table->dropColumn('isVerified');
        }
        $table->string('status')->default('Active');
    });

    Schema::table('service_providers', function (Blueprint $table) {
        if (Schema::hasColumn('service_providers', 'isVerified')) {
            $table->dropColumn('isVerified');
        }
        $table->string('status')->default('Active');
    });
    }

    public function down()
    {
    Schema::table('customers', function (Blueprint $table) {
        $table->dropColumn('status');
        $table->boolean('isVerified')->default(false);
    });

    Schema::table('service_providers', function (Blueprint $table) {
        $table->dropColumn('status');
        $table->boolean('isVerified')->default(false);
    });
    }
};
