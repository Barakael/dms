<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('document_permissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('document_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->enum('permission', ['view', 'download', 'edit', 'share']);
            $table->foreignId('granted_by')->constrained('users')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['document_id', 'user_id', 'permission']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('document_permissions');
    }
};
