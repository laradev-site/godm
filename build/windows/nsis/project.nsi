Unicode true

!define INFO_PROJECTNAME    "godm"
!define INFO_COMPANYNAME    "Laradev"
!define INFO_PRODUCTNAME    "godm"
!define PRODUCT_EXECUTABLE  "godm.exe"
!define UNINST_KEY_NAME     "godm"

!include "wails_tools.nsh"

# Solid LZMA compression for compact installer containing yt-dlp & ffmpeg
SetCompressor /SOLID lzma

# The version information for this two must consist of 4 parts
VIProductVersion "${INFO_PRODUCTVERSION}.0"
VIFileVersion    "${INFO_PRODUCTVERSION}.0"

VIAddVersionKey "CompanyName"     "${INFO_COMPANYNAME}"
VIAddVersionKey "FileDescription" "${INFO_PRODUCTNAME} Installer"
VIAddVersionKey "ProductVersion"  "${INFO_PRODUCTVERSION}"
VIAddVersionKey "FileVersion"     "${INFO_PRODUCTVERSION}"
VIAddVersionKey "LegalCopyright"  "${INFO_COPYRIGHT}"
VIAddVersionKey "ProductName"     "${INFO_PRODUCTNAME}"

# Enable HiDPI support. https://nsis.sourceforge.io/Reference/ManifestDPIAware
ManifestDPIAware true

!include "MUI2.nsh"

!define MUI_ICON "..\icon.ico"
!define MUI_UNICON "..\icon.ico"
!define MUI_FINISHPAGE_NOAUTOCLOSE
!define MUI_ABORTWARNING

# Finish page options
!define MUI_FINISHPAGE_RUN "$INSTDIR\${PRODUCT_EXECUTABLE}"
!define MUI_FINISHPAGE_RUN_TEXT "Launch godm"

!insertmacro MUI_PAGE_WELCOME # Welcome to the installer page.
!insertmacro MUI_PAGE_DIRECTORY # In which folder install page.
!insertmacro MUI_PAGE_INSTFILES # Installing page.
!insertmacro MUI_PAGE_FINISH # Finished installation page.

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES # Uninstalling page

!insertmacro MUI_LANGUAGE "English" # Set the Language of the installer

Name "${INFO_PRODUCTNAME}"
OutFile "..\..\..\bin\${INFO_PROJECTNAME}-${ARCH}-installer.exe"
!if "${WAILS_INSTALL_SCOPE}" == "user"
    InstallDir "$LOCALAPPDATA\Programs\${INFO_PRODUCTNAME}"
!else
    InstallDir "$PROGRAMFILES64\${INFO_COMPANYNAME}\${INFO_PRODUCTNAME}"
!endif
ShowInstDetails show

Function .onInit
   !insertmacro wails.checkArchitecture
FunctionEnd

Section
    !insertmacro wails.setShellContext

    !insertmacro wails.webview2runtime

    SetOutPath "$INSTDIR"
    
    # 1. Main executable (godm.exe)
    !insertmacro wails.files

    # 2. CLI utility (godm-cli.exe) if available
    ${if} ${FileExists} "..\..\..\bin\godm-cli.exe"
        File "..\..\..\bin\godm-cli.exe"
    ${endif}

    # 3. Complete media engine tools: yt-dlp.exe and ffmpeg.exe bundled directly
    SetOutPath "$INSTDIR\tools"
    ${if} ${FileExists} "..\..\..\tools\yt-dlp.exe"
        File "..\..\..\tools\yt-dlp.exe"
    ${elseif} ${FileExists} "..\..\..\bin\tools\yt-dlp.exe"
        File "..\..\..\bin\tools\yt-dlp.exe"
    ${endif}

    ${if} ${FileExists} "..\..\..\tools\ffmpeg.exe"
        File "..\..\..\tools\ffmpeg.exe"
    ${elseif} ${FileExists} "..\..\..\bin\tools\ffmpeg.exe"
        File "..\..\..\bin\tools\ffmpeg.exe"
    ${endif}

    # 4. Chrome Extension bundle
    SetOutPath "$INSTDIR\extension"
    ${if} ${FileExists} "..\..\..\extension\*.*"
        File /r "..\..\..\extension\*.*"
    ${endif}
    SetOutPath "$INSTDIR"
    ${if} ${FileExists} "..\..\..\godm-chrome-extension.zip"
        File "..\..\..\godm-chrome-extension.zip"
    ${endif}

    # 5. Shortcuts
    # SetOutPath sets the "Start in" working directory for created shortcuts
    SetOutPath "$INSTDIR"

    # Always create shortcut on Current User Desktop so it appears directly on the user's desktop screen
    SetShellVarContext current
    CreateShortcut "$DESKTOP\godm.lnk" "$INSTDIR\${PRODUCT_EXECUTABLE}" "" "$INSTDIR\${PRODUCT_EXECUTABLE}" 0 SW_SHOWNORMAL "" "godm - Download Accelerator"
    CreateShortcut "$SMPROGRAMS\godm.lnk" "$INSTDIR\${PRODUCT_EXECUTABLE}" "" "$INSTDIR\${PRODUCT_EXECUTABLE}" 0 SW_SHOWNORMAL "" "godm - Download Accelerator"

    # Also create in All Users Start Menu if installed for all users
    SetShellVarContext all
    CreateShortcut "$SMPROGRAMS\godm.lnk" "$INSTDIR\${PRODUCT_EXECUTABLE}" "" "$INSTDIR\${PRODUCT_EXECUTABLE}" 0 SW_SHOWNORMAL "" "godm - Download Accelerator"

    !insertmacro wails.associateFiles
    !insertmacro wails.associateCustomProtocols
    
    !insertmacro wails.writeUninstaller
SectionEnd

Section "uninstall" 
    # Remove shortcuts from current user desktop and start menu
    SetShellVarContext current
    Delete "$DESKTOP\godm.lnk"
    Delete "$SMPROGRAMS\godm.lnk"

    # Remove shortcuts from all users
    SetShellVarContext all
    Delete "$DESKTOP\godm.lnk"
    Delete "$SMPROGRAMS\godm.lnk"

    RMDir /r "$AppData\${PRODUCT_EXECUTABLE}" # Remove the WebView2 DataPath
    RMDir /r "$INSTDIR\tools"
    RMDir /r "$INSTDIR\extension"
    RMDir /r "$INSTDIR"

    !insertmacro wails.unassociateFiles
    !insertmacro wails.unassociateCustomProtocols

    !insertmacro wails.deleteUninstaller
SectionEnd
