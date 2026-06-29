<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DepartmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'code' => $this->code,
            'description' => $this->description,
            'active' => $this->active,
            'head_user_id' => $this->head_user_id,
            'head' => $this->whenLoaded('head', fn () => new UserResource($this->head)),
            'staff_count' => $this->whenCounted('staff'),
            'documents_count' => $this->whenCounted('documents'),
        ];
    }
}
