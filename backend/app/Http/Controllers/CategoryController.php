<?php

namespace App\Http\Controllers;

use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Database\QueryException; 
use App\Models\Customer;
use Illuminate\Support\Facades\Hash;
use App\Models\ServiceProvider;


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
            'description' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        // Create category
        $category = Category::create([
            'name' => $request->name,
            'description' => $request->description,
            'status' => $request->status ?? 'Active' // default value if not provided
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Category created successfully',
            'category' => $category,
        ]);
    }

    /**
     * Fetch all categories (Read)
     */
    public function getCategories()
    {
        $categories = Category::all();
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
            $category->delete(); // permanently remove

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
        $category->description = $request->input('description', $category->description);
        $category->status = $request->input('status', $category->status);
        $category->save();

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
     public function login(Request $request)
    {
        
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation errors',
                'errors' => $validator->errors()
            ], 422);
        }

        // search for provider by their email
        $customer = Customer::where('email', $request->email)->first();

        
        if (!$customer || !Hash::check($request->password, $customer->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid email or password'
            ], 401);
        }

        //  Return success
        return response()->json([
            'success' => true,
            'message' => 'Login successful',
            'data' => $customer
        ]);
    }
}
