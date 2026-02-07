$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$packDir = Split-Path -Parent $scriptDir
$pack_name = Split-Path -Leaf $packDir
$mojang = "$home/AppData/Roaming/Minecraft Bedrock/Users/Shared/games/com.mojang"

New-Item -Path "$packDir/release/$pack_name" -ItemType Directory

Compress-Archive `
    -Path "$packDir/BP" `
    -DestinationPath "$packDir/release/$pack_name/BP-$pack_name.mcpack"

Compress-Archive `
    -Path "$packDir/RP" `
    -DestinationPath "$packDir/release/$pack_name/RP-$pack_name.mcpack"

Compress-Archive `
    -Path "$packDir/release/$pack_name" `
    -DestinationPath "$packDir/release/$pack_name.mcaddon"
