<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FolderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'department_id' => $this->department_id,
            'project_id' => $this->project_id,
            'parent_id' => $this->parent_id,
            'children' => FolderResource::collection($this->whenLoaded('children')),
            'documents_count' => $this->whenCounted('documents'),
        ];
    }
}
