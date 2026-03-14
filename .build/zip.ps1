$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$packDir = Split-Path -Parent $scriptDir
$pack_name = Split-Path -Leaf $packDir

Compress-Archive `
    -Path "$packDir/BP", "$packDir/RP"`
    -DestinationPath "$packDir/release/$pack_name.mcaddon"`
    -CompressionLevel "Optimal"`
    -Force
