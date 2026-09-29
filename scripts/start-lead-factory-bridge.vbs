' Creation+Alt+Fix - Silent Background Launcher voor de Factory Bridge
' Start de lokale bridge zonder zichtbaar PowerShell of CMD venster.

Set WshShell = CreateObject("WScript.Shell")
strPath = WshShell.CurrentDirectory

' Voer node factory/server/factory-bridge.js uit in verborgen venstermodus (0)
WshShell.Run "node factory\server\factory-bridge.js", 0, False
