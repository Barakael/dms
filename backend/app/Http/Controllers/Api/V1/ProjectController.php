<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProjectResource;
use App\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ProjectController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Project::with(['manager', 'department'])->withCount(['staff', 'documents']);

        if (! $request->user()->isSystemAdmin()) {
            $query->where(function ($q) use ($request) {
                $q->where('manager_user_id', $request->user()->id)
                    ->orWhereHas('staff', fn ($s) => $s->where('user_id', $request->user()->id));
            });
        }

        return ProjectResource::collection($query->orderBy('name')->get());
    }

    public function mine(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();

        $projects = Project::with(['manager', 'department'])
            ->withCount(['staff', 'documents'])
            ->where(function ($q) use ($user) {
                $q->where('manager_user_id', $user->id)
                    ->orWhereHas('staff', fn ($s) => $s->where('user_id', $user->id));
            })
            ->orderBy('name')
            ->get();

        return ProjectResource::collection($projects);
    }

    public function store(Request $request): JsonResponse
    {
        $request->user()->isSystemAdmin() || abort(403);

        $data = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:20|unique:projects,code',
            'description' => 'nullable|string',
            'manager_user_id' => 'nullable|exists:users,id',
            'department_id' => 'nullable|exists:departments,id',
            'active' => 'boolean',
        ]);

        $project = Project::create($data);

        return response()->json(new ProjectResource($project->load(['manager', 'department'])), 201);
    }

    public function show(Project $project): ProjectResource
    {
        return new ProjectResource($project->load(['manager', 'department'])->loadCount(['staff', 'documents']));
    }

    public function update(Request $request, Project $project): ProjectResource
    {
        $request->user()->isSystemAdmin() || abort(403);

        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'code' => 'sometimes|string|max:20|unique:projects,code,' . $project->id,
            'description' => 'nullable|string',
            'manager_user_id' => 'nullable|exists:users,id',
            'department_id' => 'nullable|exists:departments,id',
            'active' => 'boolean',
        ]);

        $project->update($data);

        return new ProjectResource($project->load(['manager', 'department'])->loadCount(['staff', 'documents']));
    }

    public function destroy(Request $request, Project $project): JsonResponse
    {
        $request->user()->isSystemAdmin() || abort(403);
        $project->delete();

        return response()->json(['message' => 'Project deleted']);
    }
}
