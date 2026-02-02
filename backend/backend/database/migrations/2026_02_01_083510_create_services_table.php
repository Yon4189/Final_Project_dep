<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('services', function (Blueprint $table) {
            $table->id('serviceID'); 
            $table->unsignedBigInteger('providerID');  // FK to serviceProviders
            $table->unsignedBigInteger('catagoryID');  // FK to categories
            $table->string('title');
            $table->text('description')->nullable();
            $table->float('estimatedCost')->default(0);
            $table->timestamps();

            $table->foreign('providerID')->references('providerID')->on('serviceProviders')->onDelete('cascade');
            $table->foreign('catagoryID')->references('catagoryID')->on('catagories')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('services');
    }
};
