<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('admins', function (Blueprint $table) {

            $table->id('adminID'); // primary key

            $table->string('fullname'); // full name of admin
            $table->string('email')->unique(); // admin email
            $table->string('phone'); // phone number
            $table->string('password'); // hashed password
            $table->string('profilePicture')->nullable(); // optional profile picture path
            
            $table->timestamps(); // created_at and updated_at
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('admins');
    }
};
