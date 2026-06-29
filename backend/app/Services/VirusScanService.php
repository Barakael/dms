<?php

namespace App\Services;

use Illuminate\Support\Facades\Process;
use Illuminate\Support\Facades\Storage;

class VirusScanService
{
    public function scan(string $diskPath): array
    {
        $fullPath = Storage::disk('local')->path($diskPath);

        if (! file_exists($fullPath)) {
            return ['result' => 'error', 'details' => 'File not found'];
        }

        if (! config('dms.clamav_enabled', true)) {
            return ['result' => 'skipped', 'details' => 'ClamAV disabled'];
        }

        $host = config('dms.clamav_host', '127.0.0.1');
        $port = config('dms.clamav_port', 3310);

        $socket = @fsockopen($host, $port, $errno, $errstr, 5);

        if (! $socket) {
            if (config('dms.clamav_fallback_clean', true)) {
                return ['result' => 'skipped', 'details' => "ClamAV unavailable: {$errstr}"];
            }

            return ['result' => 'error', 'details' => "ClamAV unavailable: {$errstr}"];
        }

        fclose($socket);

        $clamscan = config('dms.clamscan_path', 'clamscan');
        $process = Process::run([$clamscan, '--no-summary', $fullPath]);

        if ($process->successful()) {
            return ['result' => 'clean', 'details' => trim($process->output())];
        }

        $output = $process->output() . $process->errorOutput();

        if (str_contains($output, 'FOUND')) {
            return ['result' => 'infected', 'details' => trim($output)];
        }

        if (config('dms.clamav_fallback_clean', true)) {
            return ['result' => 'skipped', 'details' => trim($output) ?: 'Scan command failed'];
        }

        return ['result' => 'error', 'details' => trim($output) ?: 'Scan command failed'];
    }
}
