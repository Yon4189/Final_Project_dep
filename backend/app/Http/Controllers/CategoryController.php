<?php

namespace App\Http\Controllers;

use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class CategoryController extends Controller
{
    // Constructor to apply admin auth middleware
    // public function __construct()
    // {
    //     // Replace 'auth:admin' with your actual admin middleware/guard
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
            'description' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failllllled',
                'errors' => $validator->errors()  // concise JSON errors
            ], 422);
        }

        // Create category
        $category = Category::create([
            'name' => $request->name,
            'description' => $request->description,
            'status' => $request->status // default value
        ]);

        // return JSON with catagoryID (primary key)
        return response()->json([
            'success' => true,
            'message' => 'Category created successfully',
            'category' => $category, // <-- rename data to category
        ]);


 
    }

    // fetch categories from DB
    public function getCategories(){
        $categories = Category::all();
        return response()->json([
            'success' =>true,
            'data' => $categories

        ]);
    }

    public function deleteCategory($id)
    {
        $category = Category::find($id);

        if (!$category) {
            return response()->json([
                'success' => false,
                'message' => 'Category not found'
            ], 404);
        }

        $category->delete(); // permanently remove

        return response()->json([
            'success' => true,
            'message' => 'Category deleted successfully'
        ]);
    }

    public function editCategory(Request $request, $id)
    {
        // 1. Find the category by ID
        $category = Category::find($id);

        if (!$category) {
            return response()->json([
                'success' => false,
                'message' => 'Category not found'
            ], 404);
        }

        // 2. Update fields (name & description)
        $category->name = $request->input('name', $category->name);
        $category->description = $request->input('description', $category->description);
         $category->status = $request->input('status', $category->status);
        
        // 3. Save changes
        $category->save();

        // 4. Return updated category
        return response()->json([
            'success' => true,
            'message' => 'Category updated successfully',
            'data' => [
                'catagoryID' => $category->catagoryID,
                'name' => $category->name,
                'description' => $category->description,
                'status' => $category->status,
            ]
        ]);
    }

    
}