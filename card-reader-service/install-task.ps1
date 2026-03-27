<#
.SYNOPSIS
    Registers CardReader-NETEnergy as a user-level Windows Task Scheduler task.
    No administrator rights required.
    Called by install.bat with -Dir parameter.
#>
param(
    [string]$Dir = (Split-Path -Parent $MyInvocation.MyCommand.Path)
)

$ErrorActionPreference = 'Continue'
$taskName = 'CardReader-NETEnergy'

# Remove trailing backslash
$Dir = $Dir.TrimEnd('\')

# ── Resolve node.exe absolute path ─────────────────────────────────────────
$nodeExe = $null
try { $nodeExe = (Get-Command node.exe -ErrorAction SilentlyContinue).Source } catch {}
if (-not $nodeExe) { try { $nodeExe = (Get-Command node -ErrorAction SilentlyContinue).Source } catch {} }
if (-not $nodeExe) {
    # ลอง path ที่ node.js มักติดตั้งอยู่
    $candidates = @(
        "$env:ProgramFiles\nodejs\node.exe",
        "${env:ProgramFiles(x86)}\nodejs\node.exe",
        "$env:LOCALAPPDATA\Programs\nodejs\node.exe",
        "$env:APPDATA\nvm\node.exe"
    )
    foreach ($c in $candidates) {
        if (Test-Path $c) { $nodeExe = $c; break }
    }
}
if (-not $nodeExe) {
    Write-Host "[WARN] ไม่พบ node.exe — จะใช้ 'node.exe' แบบ fallback (ต้องอยู่ใน PATH)"
    $nodeExe = 'node.exe'
}

$serverScript = Join-Path $Dir 'server.js'

Write-Host "  Service dir : $Dir"
Write-Host "  Node.js     : $nodeExe"
Write-Host "  Script      : $serverScript"

if (-not (Test-Path $serverScript)) {
    Write-Host "[ERROR] ไม่พบ server.js ที่ $serverScript"
    exit 1
}

# ── Remove old task ──────────────────────────────────────────────────────────
Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue

# ── Build task components ────────────────────────────────────────────────────

# ใช้ absolute path ทั้งคู่ เพื่อให้ Task Scheduler หา server.js เจอเสมอ
$action = New-ScheduledTaskAction `
    -Execute          $nodeExe `
    -Argument         "`"$serverScript`"" `
    -WorkingDirectory $Dir

$trigger = New-ScheduledTaskTrigger -AtLogOn

# RestartCount + RestartInterval: เมื่อ process หยุด (รวมถึงหลัง auto-update)
# Task Scheduler จะ restart ให้อัตโนมัติภายใน 30 วินาที สูงสุด 10 ครั้ง
$settings = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit       ([TimeSpan]::Zero) `
    -MultipleInstances        IgnoreNew `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -RestartCount             10 `
    -RestartInterval          (New-TimeSpan -Seconds 30)

$principal = New-ScheduledTaskPrincipal `
    -UserId    $env:USERNAME `
    -LogonType Interactive `
    -RunLevel  Limited

# ── Register ─────────────────────────────────────────────────────────────────
try {
    Register-ScheduledTask `
        -TaskName  $taskName `
        -Action    $action `
        -Trigger   $trigger `
        -Settings  $settings `
        -Principal $principal `
        -Force `
        -ErrorAction Stop | Out-Null

    Write-Host "[OK] Task '$taskName' ลงทะเบียนแล้ว — service จะเริ่มอัตโนมัติทุกครั้งที่ Login"
    exit 0
} catch {
    Write-Host "[ERROR] ลงทะเบียน Task Scheduler ล้มเหลว: $_"
    Write-Host ""
    Write-Host "       กรุณารัน install.bat อีกครั้ง หรือแจ้ง IT Support"
    exit 1
}
