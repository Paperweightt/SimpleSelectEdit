$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$packDir = Split-Path -Parent $scriptDir
$pack_name = Split-Path -Leaf $packDir
$mojang = "$home/AppData/Roaming/Minecraft Bedrock/Users/Shared/games/com.mojang"

#symlinks
Remove-Item -r -Path "$mojang/development_behavior_packs/$pack_name" 
Remove-Item -r -Path "$mojang/development_resource_packs/$pack_name"
