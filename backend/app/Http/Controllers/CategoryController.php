<?php

namespace App\Http\Controllers;

use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Database\QueryException; 
use App\Models\Customer;
use Illuminate\Support\Facades\Hash;
use App\Models\ServiceProvider;
use Illuminate\Support\Facades\Cache;


class CategoryController extends Controller
{
    // Constructor to apply admin auth middleware (commented out)
    // public function __construct()
    // {
    //     $this->middleware('auth:admin'); 
    // }

    /**
     * Add a new category (Create)
     */
    public function addCategory(Request $request)
    {
        // validate input
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'icon' => 'nullable|string|max:1000', // allow longer for base64 or URLs
            'icon_file' => 'nullable|image|mimes:jpeg,png,jpg,gif,svg|max:2048',
            'description' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $iconPath = $request->icon;

        if ($request->hasFile('icon_file')) {
            $path = $request->file('icon_file')->store('categories', 'public');
            $iconPath = asset('storage/' . $path);
        }

        // Create category
        $category = Category::create([
            'name' => $request->name,
            'icon' => $iconPath,
            'description' => $request->description,
        ]);

        Cache::forget('categories_all'); // Invalidate cache

        return response()->json([
            'success' => true,
            'message' => 'Category created successfully',
            'category' => $category,
        ]);
    }

    /**
     * Fetch all categories (Read) — cached for 1 hour
     */
    public function getCategories()
    {
        $categories = Cache::remember('categories_all', 3600, function () {
            return Category::all();
        });

        return response()->json([
            'success' => true,
            'data' => $categories
        ]);
    }

    /**
     * Delete a category (Delete) – with foreign key check
     */
    public function deleteCategory($id)
    {
        $category = Category::find($id);

        if (!$category) {
            return response()->json([
                'success' => false,
                'message' => 'Category not found'
            ], 404);
        }

        try {
            $category->delete();

            Cache::forget('categories_all'); // Invalidate cache

            return response()->json([
                'success' => true,
                'message' => 'Category deleted successfully'
            ]);
        } catch (QueryException $e) {
            // Check for foreign key constraint violation (MySQL error 1451)
            if ($e->errorInfo[1] == 1451) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot delete category because it is still used by services or service providers. Remove or reassign them first.'
                ], 409); // Conflict
            }
            // Other database error
            return response()->json([
                'success' => false,
                'message' => 'Database error: ' . $e->getMessage()
            ], 500);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error deleting category: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update a category (Edit)
     */
    public function editCategory(Request $request, $id)
    {
        $category = Category::find($id);

        if (!$category) {
            return response()->json([
                'success' => false,
                'message' => 'Category not found'
            ], 404);
        }

        $category->name = $request->input('name', $category->name);
        
        if ($request->hasFile('icon_file')) {
            $path = $request->file('icon_file')->store('categories', 'public');
            $category->icon = asset('storage/' . $path);
        } else {
            $category->icon = $request->input('icon', $category->icon);
        }

        $category->description = $request->input('description', $category->description);
        $category->save();

        Cache::forget('categories_all'); // Invalidate cache

        return response()->json([
            'success' => true,
            'message' => 'Category updated successfully',
            'data' => [
                'catagoryID' => $category->catagoryID,
                'name' => $category->name,
                'icon' => $category->icon,
                'description' => $category->description,
            ]
        ]);
    }
}
