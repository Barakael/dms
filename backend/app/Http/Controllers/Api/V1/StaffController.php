<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\StaffProfileResource;
use App\Models\Department;
use App\Models\Project;
use App\Models\StaffProfile;
use App\Models\User;
use App\Traits\ManagesUnitDocuments;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Hash;

class StaffController extends Controller
{
    use ManagesUnitDocuments;

    public function index(Request $request): AnonymousResourceCollection
    {
        $query = StaffProfile::with(['user.roles', 'department', 'project']);

        if (! $request->user()->isSystemAdmin()) {
            $headedDeptIds = Department::where('head_user_id', $request->user()->id)->pluck('id');
            $managedProjectIds = Project::where('manager_user_id', $request->user()->id)->pluck('id');

            $query->where(function ($q) use ($headedDeptIds, $managedProjectIds) {
                $q->whereIn('department_id', $headedDeptIds)
                    ->orWhereIn('project_id', $managedProjectIds);
            });
        }

        return StaffProfileResource::collection($query->orderBy('id')->get());
    }

    public function departmentStaff(Request $request, Department $department): AnonymousResourceCollection
    {
        $this->authorizeUnit($request, $department->id, null);

        return StaffProfileResource::collection(
            StaffProfile::with(['user', 'department'])
                ->where('department_id', $department->id)
                ->get()
        );
    }

    public function projectStaff(Request $request, Project $project): AnonymousResourceCollection
    {
        $this->authorizeUnit($request, null, $project->id);

        return StaffProfileResource::collection(
            StaffProfile::with(['user', 'project'])
                ->where('project_id', $project->id)
                ->get()
        );
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8',
            'title' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:50',
            'department_id' => 'nullable|exists:departments,id',
            'project_id' => 'nullable|exists:projects,id',
            'role' => 'required|in:staff,department_head,project_manager',
        ]);

        $this->authorizeUnit($request, $data['department_id'] ?? null, $data['project_id'] ?? null, adminOnly: false);

        if (! $request->user()->isSystemAdmin() && $data['role'] !== 'staff') {
            abort(403, 'Only administrators can assign manager roles.');
        }

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
        ]);

        $user->assignRole($data['role']);

        $profile = StaffProfile::create([
            'user_id' => $user->id,
            'department_id' => $data['department_id'] ?? null,
            'project_id' => $data['project_id'] ?? null,
            'title' => $data['title'] ?? null,
            'phone' => $data['phone'] ?? null,
        ]);

        if ($data['role'] === 'department_head' && ! empty($data['department_id'])) {
            Department::where('id', $data['department_id'])->update(['head_user_id' => $user->id]);
        }

        if ($data['role'] === 'project_manager' && ! empty($data['project_id'])) {
            Project::where('id', $data['project_id'])->update(['manager_user_id' => $user->id]);
        }

        return response()->json(new StaffProfileResource($profile->load(['user.roles', 'department', 'project'])), 201);
    }

    public function update(Request $request, StaffProfile $staff): StaffProfileResource
    {
        $request->user()->isSystemAdmin() || abort(403);

        $user = $staff->user;
        abort_if(! $user, 404, 'User not found.');

        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,' . $user->id,
            'password' => 'nullable|string|min:8',
            'title' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:50',
            'department_id' => 'nullable|exists:departments,id',
            'project_id' => 'nullable|exists:projects,id',
            'role' => 'sometimes|in:staff,department_head,project_manager',
            'status' => 'sometimes|in:active,inactive',
        ]);

        $userFields = collect($data)->only(['name', 'email'])->filter(fn ($v) => $v !== null)->all();
        if (! empty($data['password'])) {
            $userFields['password'] = Hash::make($data['password']);
        }
        if ($userFields) {
            $user->update($userFields);
        }

        $profileFields = collect($data)->only(['title', 'phone', 'department_id', 'project_id', 'status'])->all();
        if (array_key_exists('department_id', $data)) {
            $profileFields['department_id'] = $data['department_id'];
        }
        if (array_key_exists('project_id', $data)) {
            $profileFields['project_id'] = $data['project_id'];
        }
        if ($profileFields) {
            $staff->update($profileFields);
        }

        if (isset($data['role'])) {
            $user->syncRoles([$data['role']]);

            if ($data['role'] === 'department_head' && $staff->department_id) {
                Department::where('id', $staff->department_id)->update(['head_user_id' => $user->id]);
            }

            if ($data['role'] === 'project_manager' && $staff->project_id) {
                Project::where('id', $staff->project_id)->update(['manager_user_id' => $user->id]);
            }
        }

        return new StaffProfileResource($staff->fresh()->load(['user.roles', 'department', 'project']));
    }

    public function destroy(Request $request, StaffProfile $staff): JsonResponse
    {
        $request->user()->isSystemAdmin() || abort(403);
        abort_if($staff->user_id === $request->user()->id, 422, 'You cannot delete your own account.');

        $user = $staff->user;
        abort_if(! $user, 404, 'User not found.');

        Department::where('head_user_id', $user->id)->update(['head_user_id' => null]);
        Project::where('manager_user_id', $user->id)->update(['manager_user_id' => null]);

        $user->delete();

        return response()->json(['message' => 'Staff member deleted']);
    }

    protected function authorizeUnit(Request $request, ?int $departmentId, ?int $projectId, bool $adminOnly = false): void
    {
        if ($request->user()->isSystemAdmin()) {
            return;
        }

        if ($adminOnly) {
            abort(403);
        }

        if (! $this->canManageUnit($request->user(), $departmentId, $projectId)) {
            abort(403);
        }
    }
}
