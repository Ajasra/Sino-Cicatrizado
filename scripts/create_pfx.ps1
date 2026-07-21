$certDir = Join-Path $PSScriptRoot "..\certs"
if (-not (Test-Path $certDir)) {
    New-Item -ItemType Directory -Path $certDir
}

$pfxPath = Join-Path $certDir "server.pfx"
$cert = New-SelfSignedCertificate -Subject "CN=SinoCicatrizado" -DnsName "localhost", "192.168.1.14", "192.168.88.1" -KeyAlgorithm RSA -KeyLength 2048 -NotAfter (Get-Date).AddYears(2) -CertStoreLocation "Cert:\CurrentUser\My"
$pwd = ConvertTo-SecureString -String "scarred" -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath $pfxPath -Password $pwd
Write-Host "Exported PFX to $pfxPath"
