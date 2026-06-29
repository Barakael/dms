<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StaffProfileResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'phone' => $this->phone,
            'status' => $this->status,
            'department_id' => $this->department_id,
            'project_id' => $this->project_id,
            'department' => $this->whenLoaded('department', fn () => new DepartmentResource($this->department)),
            'project' => $this->whenLoaded('project', fn () => new ProjectResource($this->project)),
            'user' => $this->whenLoaded('user', fn () => new UserResource($this->user)),
        ];
    }
}
