# Play notification sound when Claude finishes responding
# PowerShell version
# PostToolUse hook: MUST output JSON to stdout and exit 0

# Accept optional audio file path parameter, default to done.mp3
param(
    [string]$SoundFile = ""
)

# PostToolUse hooks must output valid JSON to stdout
Write-Output '{}'

# Get the directory where this script is located
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Use provided sound file or default to done.mp3
if ($SoundFile -ne "") {
    $AudioFile = $SoundFile
} else {
    $AudioFile = Join-Path $ScriptDir "done.mp3"
}

# Check if audio file exists
if (-not (Test-Path $AudioFile)) {
    Write-Host "Audio file not found: $AudioFile" -ForegroundColor Red
    exit 0
}

# Function to try playing audio with a specific method
function Play-Audio {
    param($Method, $Command)
    
    try {
        Invoke-Expression $Command
        return $true
    }
    catch {
        return $false
    }
}

# Try different audio players in order of preference

# Method 1: .NET MediaPlayer (most reliable on modern Windows)
try {
    Add-Type -AssemblyName PresentationCore
    $mediaPlayer = New-Object System.Windows.Media.MediaPlayer
    $mediaPlayer.Open([uri]$AudioFile)
    $mediaPlayer.Play()

    # Wait for audio to finish (max 5 seconds)
    $timeout = 50  # 5 seconds (50 * 100ms)
    $count = 0
    while ($mediaPlayer.NaturalDuration.HasTimeSpan -eq $false -and $count -lt $timeout) {
        Start-Sleep -Milliseconds 100
        $count++
    }

    if ($mediaPlayer.NaturalDuration.HasTimeSpan) {
        $duration = $mediaPlayer.NaturalDuration.TimeSpan.TotalSeconds
        Start-Sleep -Seconds $duration
    }

    $mediaPlayer.Stop()
    $mediaPlayer.Close()
    exit 0
}
catch {
    # Continue to next method
}

# Method 2: Windows Media Player COM object
if (Play-Audio "WMP" "& {`$wmplayer = New-Object -ComObject WMPLib.WindowsMediaPlayer; `$wmplayer.URL = '$AudioFile'; `$wmplayer.controls.play(); Start-Sleep -Seconds 2}") {
    exit 0
}

# Method 3: VLC (if installed)
$vlcPath = Get-Command vlc -ErrorAction SilentlyContinue
if ($vlcPath) {
    if (Play-Audio "VLC" "& vlc --intf dummy --play-and-exit '$AudioFile'") {
        exit 0
    }
}

# Method 4: ffplay (if ffmpeg is installed)
$ffplayPath = Get-Command ffplay -ErrorAction SilentlyContinue
if ($ffplayPath) {
    if (Play-Audio "ffplay" "& ffplay -nodisp -autoexit -volume 50 '$AudioFile'") {
        exit 0
    }
}

# Method 5: Windows Media Player command line
$wmplayerPath = Get-Command wmplayer -ErrorAction SilentlyContinue
if ($wmplayerPath) {
    if (Play-Audio "wmplayer" "& wmplayer /play /close '$AudioFile'") {
        exit 0
    }
}

# Method 6: PowerShell with System.Media.SoundPlayer (for WAV files)
if ($AudioFile -like "*.wav") {
    try {
        Add-Type -AssemblyName System.Windows.Forms
        $player = New-Object System.Media.SoundPlayer $AudioFile
        $player.PlaySync()
        exit 0
    }
    catch {
        # Continue to next method
    }
}

# If no player found, show message
Write-Host "No suitable audio player found. Install VLC or ffmpeg for better audio support." -ForegroundColor Yellow
Write-Host "Audio file location: $AudioFile" -ForegroundColor Cyan

exit 0
