; ============================================================================
;  LucaMoneyManager - Inno Setup script
; ----------------------------------------------------------------------------
;  Compilato da tools\build\build-installer.bat con:
;    iscc.exe /DAppVersion=X.Y.Z /O"<dist>\installer" LucaMoneyManager.iss
;  Nota: i path relativi qui dentro (Source:) restano relativi a QUESTO .iss,
;  cioe a installer\, non alla cartella dello script che lo compila.
;
;  Sorgente: ..\dist\build\LucaMoneyManager\  (app-image prodotta da jpackage,
;  arricchita con la cartella web\ copiata accanto al .exe).
;
;  L'installer:
;    - chiede dove installare (default %LOCALAPPDATA%\Programs\LucaMoneyManager)
;    - permette upgrade a parita' di AppId (sovrascrive l'install precedente)
;    - chiede se creare shortcut sul desktop (opzionale)
;    - crea voce Start Menu
;    - registra uninstaller in "App e funzionalita'"
;    - chiude l'app se in esecuzione (CloseApplications=yes)
;    - per-user di default (no UAC); l'utente puo' scegliere admin via dialog
;
;  I dati utente in %APPDATA%\Roaming\LucaMoneyManager\ NON sono toccati.
; ============================================================================

#ifndef AppVersion
  #define AppVersion "0.0.0"
#endif

#define MyAppName      "LucaMoneyManager"
#define MyAppVersion   AppVersion
#define MyAppPublisher "Luca"
#define MyAppExeName   "LucaMoneyManager.exe"
; GUID stabile: identifica l'app cosi' nuove versioni sono riconosciute come upgrade
#define MyAppId        "{{8B3E7C2A-9D4F-4E6B-A1C5-3F8B9D2E7A5C}"

[Setup]
AppId={#MyAppId}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
VersionInfoVersion={#MyAppVersion}
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
OutputBaseFilename=LucaMoneyManager-{#MyAppVersion}
SetupIconFile=..\target\icon.ico
UninstallDisplayIcon={app}\{#MyAppExeName}
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
CloseApplications=yes
RestartApplications=no

[Languages]
Name: "italian"; MessagesFile: "compiler:Languages\Italian.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
Source: "..\dist\build\LucaMoneyManager\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#MyAppName}";                       Filename: "{app}\{#MyAppExeName}"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}";                 Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#MyAppName}}"; Flags: nowait postinstall skipifsilent
