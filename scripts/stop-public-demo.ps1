$ErrorActionPreference='Stop'
$projectRoot=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$runtimePath=Join-Path $projectRoot '.local/public-demo-runtime.json'
if(!(Test-Path -LiteralPath $runtimePath)){Write-Output 'No public demo runtime found.';exit}
$runtime=Get-Content -LiteralPath $runtimePath -Raw | ConvertFrom-Json
foreach($kind in @('server','tunnel')){
 $processId=if($kind -eq 'server'){$runtime.serverPid}else{$runtime.tunnelPid}
 $process=Get-CimInstance Win32_Process -Filter "ProcessId = $processId" -ErrorAction SilentlyContinue
 if(!$process){continue}
 $isExpected=if($kind -eq 'server'){$process.Name -eq 'node.exe' -and $process.CommandLine -like '*server/index.ts*--personaverse-public-demo*'}else{$process.ExecutablePath -eq (Join-Path $projectRoot '.local/tools/cloudflared.exe') -and $process.CommandLine -like "*http://127.0.0.1:$($runtime.port)*"}
 if(!$isExpected){throw "Refusing to stop an unrelated process with PID $processId."}
 Stop-Process -Id $processId
}
Remove-Item -LiteralPath $runtimePath
Write-Output 'Public demo stopped. Local studio and saved data were preserved.'
