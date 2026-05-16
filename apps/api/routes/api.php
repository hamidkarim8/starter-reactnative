<?php

use App\Http\Controllers\ItemController;
use Illuminate\Support\Facades\Route;

// Health check
Route::get('/health', fn() => response()->json(['status' => 'ok']));

// Items CRUD
Route::apiResource('items', ItemController::class);
