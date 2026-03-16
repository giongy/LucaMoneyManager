' LucaMoneyManager.vbs
' Avvia l'app senza finestra di console
' Doppio click per lanciare

Set sh = WScript.CreateObject("WScript.Shell")
sh.CurrentDirectory = "D:\LucaMoneyManager"

Dim env: Set env = sh.Environment("Process")
env("PATH") = "C:\Tools\apache-maven-3.9.6\bin;C:\Program Files\Java\jdk-25\bin;" & env("PATH")

' 0 = finestra nascosta, False = non aspetta
sh.Run "C:\Tools\apache-maven-3.9.6\bin\mvn.cmd exec:java", 0, False
