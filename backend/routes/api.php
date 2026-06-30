<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\V1\AuditLogController;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\DepartmentController;
use App\Http\Controllers\Api\V1\DocumentController;
use App\Http\Controllers\Api\V1\DocumentDeletionRequestController;
use App\Http\Controllers\Api\V1\DocumentPermissionController;
use App\Http\Controllers\Api\V1\FolderController;
use App\Http\Controllers\Api\V1\NotificationController;
use App\Http\Controllers\Api\V1\ProjectController;
use App\Http\Controllers\Api\V1\StaffController;
use App\Http\Controllers\Api\V1\TagController;
use Illuminate\Support\Facades\Route;

Route::post('/auth/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);

    Route::prefix('v1')->group(function () {
        Route::get('/dashboard/stats', [DashboardController::class, 'stats']);

        Route::get('/departments/mine', [DepartmentController::class, 'mine']);
        Route::apiResource('departments', DepartmentController::class);

        Route::get('/projects/mine', [ProjectController::class, 'mine']);
        Route::apiResource('projects', ProjectController::class);

        Route::get('/staff', [StaffController::class, 'index']);
        Route::post('/staff', [StaffController::class, 'store']);
        Route::patch('/staff/{staff}', [StaffController::class, 'update']);
        Route::delete('/staff/{staff}', [StaffController::class, 'destroy']);
        Route::get('/departments/{department}/staff', [StaffController::class, 'departmentStaff']);
        Route::get('/projects/{project}/staff', [StaffController::class, 'projectStaff']);

        Route::apiResource('folders', FolderController::class)->except(['show']);

        Route::get('/documents', [DocumentController::class, 'index']);
        Route::post('/documents', [DocumentController::class, 'store']);
        Route::get('/documents/{document}', [DocumentController::class, 'show']);
        Route::patch('/documents/{document}', [DocumentController::class, 'update']);
        Route::delete('/documents/{document}', [DocumentController::class, 'destroy']);
        Route::get('/documents/{document}/download', [DocumentController::class, 'download']);
        Route::get('/documents/{document}/preview', [DocumentController::class, 'preview']);
        Route::get('/documents/{document}/versions', [DocumentController::class, 'versions']);
        Route::post('/documents/{document}/versions', [DocumentController::class, 'storeVersion']);

        Route::get('/deletion-requests', [DocumentDeletionRequestController::class, 'index']);
        Route::post('/documents/{document}/deletion-requests', [DocumentDeletionRequestController::class, 'store']);
        Route::post('/deletion-requests/{deletionRequest}/approve', [DocumentDeletionRequestController::class, 'approve']);
        Route::post('/deletion-requests/{deletionRequest}/reject', [DocumentDeletionRequestController::class, 'reject']);

        Route::get('/documents/{document}/permissions', [DocumentPermissionController::class, 'index']);
        Route::post('/documents/{document}/permissions', [DocumentPermissionController::class, 'store']);
        Route::delete('/documents/{document}/permissions', [DocumentPermissionController::class, 'destroy']);

        Route::get('/audit-logs', [AuditLogController::class, 'index']);

        Route::get('/notifications', [NotificationController::class, 'index']);
        Route::post('/notifications/{id}/read', [NotificationController::class, 'markRead']);
        Route::post('/notifications/read-all', [NotificationController::class, 'markAllRead']);

        Route::get('/tags', [TagController::class, 'index']);
    });
});
