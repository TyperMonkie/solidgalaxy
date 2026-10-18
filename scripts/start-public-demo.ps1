param([int]$PublicPort=4183)
$ErrorActionPreference='Stop'
$projectRoot=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$localRoot=Join-Path $projectRoot '.local'
New-Item -ItemType Directory -Path $localRoot -Force | Out-Null
$settingsPath=Join-Path $localRoot 'public-demo-settings.json'
$runtimePath=Join-Path $localRoot 'public-demo-runtime.json'
if(Test-Path -LiteralPath $runtimePath){
 $runtime=Get-Content -LiteralPath $runtimePath -Raw | ConvertFrom-Json
 $running=Get-CimInstance Win32_Process -Filter "ProcessId = $($runtime.serverPid)" -ErrorAction SilentlyContinue
 $tunnelRunning=Get-CimInstance Win32_Process -Filter "ProcessId = $($runtime.tunnelPid)" -ErrorAction SilentlyContinue
 if($running -and $running.CommandLine -like '*--personaverse-public-demo*' -and $tunnelRunning -and $tunnelRunning.ExecutablePath -eq (Join-Path $localRoot 'tools/cloudflared.exe')){
  $settings=Get-Content -LiteralPath $settingsPath -Raw | ConvertFrom-Json
  Write-Output "URL: $($runtime.url)";Write-Output "Experience code: $($settings.code)";exit
 }
 & (Join-Path $PSScriptRoot 'stop-public-demo.ps1')
}
if(Get-NetTCPConnection -LocalPort $PublicPort -State Listen -ErrorAction SilentlyContinue){throw "Port $PublicPort is already in use. Choose another PublicPort."}
if(!(Test-Path -LiteralPath (Join-Path $projectRoot 'dist/index.html'))){throw 'Run npm run build first.'}
if(!(Test-Path -LiteralPath $settingsPath)){
 $bytes=New-Object byte[] 12;$rng=[Security.Cryptography.RandomNumberGenerator]::Create();$rng.GetBytes($bytes);$rng.Dispose()
 $code='PV-'+([BitConverter]::ToString($bytes)).Replace('-','')
 @{code=$code} | ConvertTo-Json | Set-Content -LiteralPath $settingsPath -Encoding utf8
}
$settings=Get-Content -LiteralPath $settingsPath -Raw | ConvertFrom-Json
$toolRoot=Join-Path $localRoot 'tools';New-Item -ItemType Directory -Path $toolRoot -Force | Out-Null
$cloudflared=Join-Path $toolRoot 'cloudflared.exe'
if(!(Test-Path -LiteralPath $cloudflared)){
 Invoke-WebRequest 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile $cloudflared
}
$signature=Get-AuthenticodeSignature -LiteralPath $cloudflared
if($signature.Status -ne 'Valid' -or $signature.SignerCertificate.Subject -notlike '*Cloudflare, Inc.*'){throw 'Cloudflare executable signature could not be verified.'}
$tunnelOut=Join-Path $localRoot 'public-tunnel.stdout.log';$tunnelErr=Join-Path $localRoot 'public-tunnel.stderr.log'
$tunnel=Start-Process -FilePath $cloudflared -ArgumentList @('tunnel','--no-autoupdate','--url',"http://127.0.0.1:$PublicPort",'--protocol','http2') -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput $tunnelOut -RedirectStandardError $tunnelErr -PassThru
$server=$null
try{
 $deadline=(Get-Date).AddSeconds(60);$publicUrl=$null
 while((Get-Date) -lt $deadline){
  $tunnel.Refresh();if($tunnel.HasExited){throw "Cloudflare exited. See $tunnelErr"}
  $log=Get-Content -LiteralPath $tunnelErr -Raw -ErrorAction SilentlyContinue
  if($log -match 'https://[a-z0-9-]+\.trycloudflare\.com'){$publicUrl=$Matches[0];break}
  Start-Sleep -Milliseconds 400
 }
 if(!$publicUrl){throw 'Cloudflare did not return a public URL within 60 seconds.'}
 $variables=@{PORT=[string]$PublicPort;HOST='127.0.0.1';PERSONAVERSE_PUBLIC_DEMO='1';PERSONAVERSE_DEMO_CODE=$settings.code;PERSONAVERSE_PUBLIC_ORIGINS=$publicUrl;PERSONAVERSE_SOCIAL_STORE=(Join-Path $localRoot 'public-social-universe.json')}
 $previous=@{}
 try{
  foreach($key in $variables.Keys){$previous[$key]=[Environment]::GetEnvironmentVariable($key,'Process');[Environment]::SetEnvironmentVariable($key,$variables[$key],'Process')}
  $node=(Get-Command node).Source
  $server=Start-Process -FilePath $node -ArgumentList @('--import','tsx','server/index.ts','--personaverse-public-demo') -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $localRoot 'public-server.stdout.log') -RedirectStandardError (Join-Path $localRoot 'public-server.stderr.log') -PassThru
 }finally{foreach($key in $previous.Keys){[Environment]::SetEnvironmentVariable($key,$previous[$key],'Process')}}
 $ready=$false
 for($i=0;$i -lt 40;$i++){
  try{$status=Invoke-RestMethod "http://127.0.0.1:$PublicPort/api/access/status";if($status.publicDemo){$ready=$true;break}}catch{}
  Start-Sleep -Milliseconds 250
 }
 if(!$ready){throw 'Public demo server did not become ready.'}
 @{serverPid=$server.Id;tunnelPid=$tunnel.Id;url=$publicUrl;port=$PublicPort;startedAt=(Get-Date).ToString('o')} | ConvertTo-Json | Set-Content -LiteralPath $runtimePath -Encoding utf8
 Write-Output "URL: $publicUrl"
 Write-Output "Experience code: $($settings.code)"
 Write-Output 'Keep this computer awake. Stop with scripts/stop-public-demo.ps1.'
}catch{
 if($server -and !$server.HasExited){Stop-Process -Id $server.Id}
 if(!$tunnel.HasExited){Stop-Process -Id $tunnel.Id}
 throw
}
