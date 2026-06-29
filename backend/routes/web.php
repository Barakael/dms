<?php

use App\Http\Controllers\Api\V1\DocumentController;
use Illuminate\Support\Facades\Route;

Route::get('/signed/documents/{document}/download', [DocumentController::class, 'signedDownload'])
    ->middleware('signed')
    ->name('documents.signed-download');

Route::get('/signed/documents/{document}/preview', [DocumentController::class, 'signedPreview'])
    ->middleware('signed')
    ->name('documents.signed-preview');
