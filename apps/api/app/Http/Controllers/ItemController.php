<?php

namespace App\Http\Controllers;

use App\Models\Item;
use Illuminate\Http\Request;

class ItemController extends Controller
{
    // GET /api/items — list all items
    public function index()
    {
        $items = Item::latest()->get();

        return response()->json([
            'success' => true,
            'data'    => $items,
        ]);
    }

    // POST /api/items — create an item
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'        => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);

        $item = Item::create($validated);

        return response()->json([
            'success' => true,
            'data'    => $item,
            'message' => 'Item created',
        ], 201);
    }

    // GET /api/items/{id} — get one item
    public function show(Item $item)
    {
        return response()->json([
            'success' => true,
            'data'    => $item,
        ]);
    }

    // PUT /api/items/{id} — update an item
    public function update(Request $request, Item $item)
    {
        $validated = $request->validate([
            'name'        => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);

        $item->update($validated);

        return response()->json([
            'success' => true,
            'data'    => $item,
            'message' => 'Item updated',
        ]);
    }

    // DELETE /api/items/{id} — delete an item
    public function destroy(Item $item)
    {
        $item->delete();

        return response()->json([
            'success' => true,
            'message' => 'Item deleted',
        ]);
    }
}
