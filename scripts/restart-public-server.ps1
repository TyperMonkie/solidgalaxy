$ErrorActionPreference='Stop'
$projectRoot=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$runtimePath=Join-Path $projectRoot '.local/public-demo-runtime.json'
$runtime=Get-Content -LiteralPath $runtimePath -Raw | ConvertFrom-Json
$settings=Get-Content -LiteralPath (Join-Path $projectRoot '.local/public-demo-settings.json') -Raw | ConvertFrom-Json
$existing=Get-CimInstance Win32_Process -Filter "ProcessId = $($runtime.serverPid)" -ErrorAction SilentlyContinue
if($existing){
 if($existing.Name -ne 'node.exe' -or $existing.CommandLine -notlike '*server/index.ts*--personaverse-public-demo*'){throw 'Refusing to stop an unrelated process.'}
 Stop-Process -Id $runtime.serverPid
 Start-Sleep -Milliseconds 500
}
$variables=@{PORT=[string]$runtime.port;HOST='127.0.0.1';PERSONAVERSE_PUBLIC_DEMO='1';PERSONAVERSE_DEMO_CODE=$settings.code;PERSONAVERSE_PUBLIC_ORIGINS=$runtime.url;PERSONAVERSE_SOCIAL_STORE=(Join-Path $projectRoot '.local/public-social-universe.json')}
$previous=@{}
try{
 foreach($key in $variables.Keys){$previous[$key]=[Environment]::GetEnvironmentVariable($key,'Process');[Environment]::SetEnvironmentVariable($key,$variables[$key],'Process')}
 $node=(Get-Command node).Source
 $server=Start-Process -FilePath $node -ArgumentList @('--import','tsx','server/index.ts','--personaverse-public-demo') -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $projectRoot '.local/public-server.stdout.log') -RedirectStandardError (Join-Path $projectRoot '.local/public-server.stderr.log') -PassThru
}finally{foreach($key in $previous.Keys){[Environment]::SetEnvironmentVariable($key,$previous[$key],'Process')}}
$ready=$false
for($i=0;$i -lt 40;$i++){
 try{$status=Invoke-RestMethod "http://127.0.0.1:$($runtime.port)/api/access/status";if($status.publicDemo){$ready=$true;break}}catch{}
 Start-Sleep -Milliseconds 250
}
if(!$ready){throw 'Public demo did not become ready. See .local/public-server.stderr.log.'}
$runtime.serverPid=$server.Id
$runtime | ConvertTo-Json | Set-Content -LiteralPath $runtimePath -Encoding utf8
Write-Output "Public server restarted. URL unchanged: $($runtime.url). Visitors need to unlock again."
