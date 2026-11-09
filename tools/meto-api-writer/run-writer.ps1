param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$WriterArgs
)

$ErrorActionPreference = 'Stop'
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
# ใช้ venv ที่ติดตั้ง claude-agent-sdk ไว้แล้วของ ModSTD (ไม่สร้าง venv ใน Google Drive)
$python = 'L:\ModSTD\tools\api-reviewer\.venv\Scripts\python.exe'
$writerScript = Join-Path $scriptRoot 'writer.py'

if (-not (Test-Path -LiteralPath $python -PathType Leaf)) {
    Write-Error "ไม่พบ Python ใน venv: $python`nดู README.md"
    exit 2
}

& $python $writerScript @WriterArgs
exit $LASTEXITCODE
