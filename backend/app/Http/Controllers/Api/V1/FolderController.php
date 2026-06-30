<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\FolderResource;
use App\Models\Folder;
use App\Traits\ManagesUnitDocuments;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class FolderController extends Controller
{
    use ManagesUnitDocuments;

    public function index(Request $request): AnonymousResourceCollection
    {
        $data = $request->validate([
            'department_id' => 'nullable|exists:departments,id',
            'project_id' => 'nullable|exists:projects,id',
            'parent_id' => 'nullable|exists:folders,id',
        ]);

        abort_if(empty($data['department_id']) && empty($data['project_id']), 422, 'department_id or project_id required');

        $this->canManageUnit($request->user(), $data['department_id'] ?? null, $data['project_id'] ?? null)
            || $request->user()->staffProfile?->department_id == ($data['department_id'] ?? null)
            || $request->user()->staffProfile?->project_id == ($data['project_id'] ?? null)
            || abort(403);

        $query = Folder::with('children')->withCount('documents')
            ->when($data['department_id'] ?? null, fn ($q, $id) => $q->where('department_id', $id))
            ->when($data['project_id'] ?? null, fn ($q, $id) => $q->where('project_id', $id));

        if (array_key_exists('parent_id', $data)) {
            $query->where('parent_id', $data['parent_id']);
        } else {
            $query->whereNull('parent_id');
        }

        return FolderResource::collection($query->orderBy('name')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'department_id' => 'nullable|exists:departments,id',
            'project_id' => 'nullable|exists:projects,id',
            'parent_id' => 'nullable|exists:folders,id',
        ]);

        abort_if(empty($data['department_id']) && empty($data['project_id']), 422, 'department_id or project_id required');

        $this->canManageUnit($request->user(), $data['department_id'] ?? null, $data['project_id'] ?? null) || abort(403);

        $folder = Folder::create([
            ...$data,
            'created_by' => $request->user()->id,
        ]);

        return response()->json(new FolderResource($folder), 201);
    }

    public function update(Request $request, Folder $folder): FolderResource
    {
        $this->canManageUnit($request->user(), $folder->department_id, $folder->project_id) || abort(403);

        $data = $request->validate(['name' => 'required|string|max:255']);
        $folder->update($data);

        return new FolderResource($folder);
    }

    public function destroy(Request $request, Folder $folder): JsonResponse
    {
        $this->canManageUnit($request->user(), $folder->department_id, $folder->project_id) || abort(403);
        $folder->delete();

        return response()->json(['message' => 'Folder deleted']);
    }
}
