<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\DepartmentResource;
use App\Models\Department;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class DepartmentController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Department::with('head')->withCount(['staff', 'documents']);

        if (! $request->user()->isSystemAdmin()) {
            $query->where(function ($q) use ($request) {
                $q->where('head_user_id', $request->user()->id)
                    ->orWhereHas('staff', fn ($s) => $s->where('user_id', $request->user()->id));
            });
        }

        return DepartmentResource::collection($query->orderBy('name')->get());
    }

    public function mine(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();

        $departments = Department::with('head')
            ->withCount(['staff', 'documents'])
            ->where(function ($q) use ($user) {
                $q->where('head_user_id', $user->id)
                    ->orWhereHas('staff', fn ($s) => $s->where('user_id', $user->id));
            })
            ->orderBy('name')
            ->get();

        return DepartmentResource::collection($departments);
    }

    public function store(Request $request): JsonResponse
    {
        $request->user()->isSystemAdmin() || abort(403);

        $data = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:20|unique:departments,code',
            'description' => 'nullable|string',
            'head_user_id' => 'nullable|exists:users,id',
            'active' => 'boolean',
        ]);

        $department = Department::create($data);

        return response()->json(new DepartmentResource($department->load('head')), 201);
    }

    public function show(Department $department): DepartmentResource
    {
        return new DepartmentResource($department->load('head')->loadCount(['staff', 'documents']));
    }

    public function update(Request $request, Department $department): DepartmentResource
    {
        $request->user()->isSystemAdmin() || abort(403);

        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'code' => 'sometimes|string|max:20|unique:departments,code,' . $department->id,
            'description' => 'nullable|string',
            'head_user_id' => 'nullable|exists:users,id',
            'active' => 'boolean',
        ]);

        $department->update($data);

        return new DepartmentResource($department->load('head')->loadCount(['staff', 'documents']));
    }

    public function destroy(Request $request, Department $department): JsonResponse
    {
        $request->user()->isSystemAdmin() || abort(403);
        $department->delete();

        return response()->json(['message' => 'Department deleted']);
    }
}
