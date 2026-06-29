<?php

return [
    'max_upload_size' => env('MAX_UPLOAD_SIZE', 26214400),
    'allowed_mimes' => [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/png',
        'image/jpeg',
        'image/gif',
        'text/plain',
        'text/csv',
    ],
    'allowed_extensions' => ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'png', 'jpg', 'jpeg', 'gif', 'txt', 'csv'],
    'clamav_enabled' => env('CLAMAV_ENABLED', true),
    'clamav_host' => env('CLAMAV_HOST', '127.0.0.1'),
    'clamav_port' => env('CLAMAV_PORT', 3310),
    'clamav_fallback_clean' => env('CLAMAV_FALLBACK_CLEAN', true),
    'clamscan_path' => env('CLAMSCAN_PATH', 'clamscan'),
    'signed_url_ttl_minutes' => env('SIGNED_URL_TTL_MINUTES', 15),
];
