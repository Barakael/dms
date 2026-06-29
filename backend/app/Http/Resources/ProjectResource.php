<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProjectResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'code' => $this->code,
            'description' => $this->description,
            'active' => $this->active,
            'manager_user_id' => $this->manager_user_id,
            'department_id' => $this->department_id,
            'manager' => $this->whenLoaded('manager', fn () => new UserResource($this->manager)),
            'department' => $this->whenLoaded('department', fn () => new DepartmentResource($this->department)),
            'staff_count' => $this->whenCounted('staff'),
            'documents_count' => $this->whenCounted('documents'),
        ];
    }
}
