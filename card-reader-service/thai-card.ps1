# thai-card.ps1 -- Thai National ID Card reader via WinSCard P/Invoke
# No Visual C++ / node-gyp required -- uses Windows built-in winscard.dll
#
# Usage:
#   powershell -NonInteractive -ExecutionPolicy Bypass -File thai-card.ps1 -mode status
#   powershell -NonInteractive -ExecutionPolicy Bypass -File thai-card.ps1 -mode read

param([string]$mode = "read")

# -- WinSCard P/Invoke ---------------------------------------------------------
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class WinSCard {
    public const uint SCOPE_USER   = 0;
    public const uint SHARE_SHARED = 2;
    public const uint PROTO_T0     = 1;
    public const uint PROTO_T1     = 2;
    public const uint LEAVE_CARD   = 0;

    [StructLayout(LayoutKind.Sequential)]
    public struct IO_REQUEST {
        public uint Protocol;
        public uint PciLength;
    }

    [DllImport("winscard.dll")]
    public static extern uint SCardEstablishContext(
        uint dwScope, IntPtr r1, IntPtr r2, out IntPtr phContext);

    [DllImport("winscard.dll")]
    public static extern uint SCardReleaseContext(IntPtr hContext);

    [DllImport("winscard.dll", CharSet = CharSet.Unicode)]
    public static extern uint SCardListReadersW(
        IntPtr hContext, string mszGroups, char[] mszReaders, ref uint pcchReaders);

    [DllImport("winscard.dll", CharSet = CharSet.Unicode)]
    public static extern uint SCardConnectW(
        IntPtr hContext, string szReader,
        uint dwShareMode, uint dwPreferredProtocols,
        out IntPtr phCard, out uint pdwActiveProtocol);

    [DllImport("winscard.dll")]
    public static extern uint SCardDisconnect(IntPtr hCard, uint dwDisposition);

    [DllImport("winscard.dll")]
    public static extern uint SCardTransmit(
        IntPtr hCard, ref IO_REQUEST pioSendPci,
        byte[] pbSend, uint cbSend,
        IntPtr pioRecv, byte[] pbRecv, ref uint pcbRecv);
}
"@

# -- TIS-620 table (index = byte - 0xA1) ---------------------------------------
$TIS620 = [int[]](
    0x0E01,0x0E02,0x0E03,0x0E04,0x0E05,0x0E06,0x0E07,0x0E08,
    0x0E09,0x0E0A,0x0E0B,0x0E0C,0x0E0D,0x0E0E,0x0E0F,0x0E10,
    0x0E11,0x0E12,0x0E13,0x0E14,0x0E15,0x0E16,0x0E17,0x0E18,
    0x0E19,0x0E1A,0x0E1B,0x0E1C,0x0E1D,0x0E1E,0x0E1F,0x0E20,
    0x0E21,0x0E22,0x0E23,0x0E24,0x0E25,0x0E26,0x0E27,0x0E28,
    0x0E29,0x0E2A,0x0E2B,0x0E2C,0x0E2D,0x0E2E,0x0E2F,0x0E30,
    0x0E31,0x0E32,0x0E33,0x0E34,0x0E35,0x0E36,0x0E37,0x0E38,
    0x0E39,0x0E3A,     0,     0,     0,     0,0x0E3F,0x0E40,
    0x0E41,0x0E42,0x0E43,0x0E44,0x0E45,0x0E46,0x0E47,0x0E48,
    0x0E49,0x0E4A,0x0E4B,0x0E4C,0x0E4D,0x0E4E,0x0E4F,0x0E50,
    0x0E51,0x0E52,0x0E53,0x0E54,0x0E55,0x0E56,0x0E57,0x0E58,
    0x0E59,0x0E5A,0x0E5B,     0,     0,     0,     0,     0
)

function Decode-TIS620([byte[]]$buf) {
    $sb = New-Object System.Text.StringBuilder
    foreach ($b in $buf) {
        if ($b -eq 0x00) { break }
        if ($b -ge 0xA1 -and $b -le 0xFF) {
            $cp = $TIS620[$b - 0xA1]
            if ($cp -gt 0) { [void]$sb.Append([char]$cp) }
        } elseif ($b -ge 0x20 -and $b -le 0x7E) {
            [void]$sb.Append([char]$b)
        }
    }
    return $sb.ToString().TrimEnd()
}

function Format-Date([byte[]]$buf) {
    $s = [System.Text.Encoding]::ASCII.GetString($buf) -replace '[^\d]',''
    if ($s.Length -ge 8) { return "$($s.Substring(0,4))-$($s.Substring(4,2))-$($s.Substring(6,2))" }
    return $s
}

# -- WinSCard helpers ----------------------------------------------------------
function Get-ScContext {
    $ctx = [IntPtr]::Zero
    $r = [WinSCard]::SCardEstablishContext([WinSCard]::SCOPE_USER, [IntPtr]::Zero, [IntPtr]::Zero, [ref]$ctx)
    if ($r -ne 0) { throw "SCardEstablishContext: 0x$($r.ToString('X8'))" }
    return $ctx
}

function Get-Readers($ctx) {
    $cch = [uint32]0
    [WinSCard]::SCardListReadersW($ctx, $null, $null, [ref]$cch) | Out-Null
    if ($cch -le 1) { return @() }
    $buf = New-Object char[] ([int]$cch)
    $r = [WinSCard]::SCardListReadersW($ctx, $null, $buf, [ref]$cch)
    if ($r -ne 0) { return @() }
    $s = New-Object System.String($buf, 0, [int]$cch)
    return @($s.Split([char]0) | Where-Object { $_ -ne '' })
}

function Send-APDU($hCard, [uint32]$proto, [byte[]]$cmd) {
    $ioReq = New-Object WinSCard+IO_REQUEST
    $ioReq.Protocol  = $proto
    $ioReq.PciLength = 8
    $recv    = New-Object byte[] 264
    $recvLen = [uint32]264
    $r = [WinSCard]::SCardTransmit($hCard, [ref]$ioReq, $cmd, [uint32]$cmd.Length, [IntPtr]::Zero, $recv, [ref]$recvLen)
    if ($r -ne 0) { throw "SCardTransmit: 0x$($r.ToString('X8'))" }
    return $recv[0..([int]$recvLen - 1)]
}

function Read-Field($hCard, [uint32]$proto, [int]$offset, [int]$len) {
    $ohi = ($offset -shr 8) -band 0xFF
    $olo =  $offset          -band 0xFF
    $lhi = ($len    -shr 8) -band 0xFF
    $llo =  $len             -band 0xFF
    $resp = Send-APDU $hCard $proto ([byte[]](0x80, 0xB0, $ohi, $olo, 0x02, $lhi, $llo))
    if ($resp.Length -lt 2) { throw "Response too short @ 0x$($offset.ToString('X4'))" }
    $sw1 = $resp[$resp.Length - 2]
    $sw2 = $resp[$resp.Length - 1]
    if ($sw1 -ne 0x90 -or $sw2 -ne 0x00) {
        throw "READ @ 0x$($offset.ToString('X4')) SW=$($sw1.ToString('X2'))$($sw2.ToString('X2'))"
    }
    return $resp[0..($resp.Length - 3)]
}

# -- Status mode ---------------------------------------------------------------
if ($mode -eq 'status') {
    try {
        $ctx = Get-ScContext
        $readers = Get-Readers $ctx
        [WinSCard]::SCardReleaseContext($ctx) | Out-Null

        if ($readers.Count -eq 0) {
            '{"ok":true,"status":"no_reader"}'
        } else {
            $ctx2 = Get-ScContext
            $hCard = [IntPtr]::Zero; $proto = [uint32]0
            $r = [WinSCard]::SCardConnectW($ctx2, $readers[0], [WinSCard]::SHARE_SHARED,
                     ([WinSCard]::PROTO_T0 -bor [WinSCard]::PROTO_T1), [ref]$hCard, [ref]$proto)
            [WinSCard]::SCardReleaseContext($ctx2) | Out-Null
            if ($r -eq 0) {
                [WinSCard]::SCardDisconnect($hCard, [WinSCard]::LEAVE_CARD) | Out-Null
                '{"ok":true,"status":"card_present"}'
            } else {
                '{"ok":true,"status":"ready"}'
            }
        }
    } catch {
        '{"ok":true,"status":"no_reader"}'
    }
    exit
}

# -- Read mode -----------------------------------------------------------------
try {
    $ctx = Get-ScContext
    $readers = Get-Readers $ctx

    if ($readers.Count -eq 0) {
        [WinSCard]::SCardReleaseContext($ctx) | Out-Null
        '{"ok":false,"error":"no_reader"}'
        exit
    }

    $hCard = [IntPtr]::Zero; $protocol = [uint32]0
    $r = [WinSCard]::SCardConnectW($ctx, $readers[0], [WinSCard]::SHARE_SHARED,
             ([WinSCard]::PROTO_T0 -bor [WinSCard]::PROTO_T1), [ref]$hCard, [ref]$protocol)

    if ($r -ne 0) {
        [WinSCard]::SCardReleaseContext($ctx) | Out-Null
        '{"ok":false,"error":"no_card"}'
        exit
    }

    # SELECT Thai ID AID: A0 00 00 00 54 48 00 01
    Send-APDU $hCard $protocol ([byte[]](0x00,0xA4,0x04,0x00,0x08,0xA0,0x00,0x00,0x00,0x54,0x48,0x00,0x01)) | Out-Null

    # Read all fields
    $cidB  = Read-Field $hCard $protocol 0x0004 74
    $thB   = Read-Field $hCard $protocol 0x00D3 100
    $enB   = Read-Field $hCard $protocol 0x0137 100
    $dobB  = Read-Field $hCard $protocol 0x019B 8
    $genB  = Read-Field $hCard $protocol 0x01A3 1
    $adB   = Read-Field $hCard $protocol 0x01AC 160
    $issB  = Read-Field $hCard $protocol 0x024C 8
    $expB  = Read-Field $hCard $protocol 0x0254 8

    [WinSCard]::SCardDisconnect($hCard, [WinSCard]::LEAVE_CARD) | Out-Null
    [WinSCard]::SCardReleaseContext($ctx) | Out-Null

    # Parse citizen ID (13 ASCII digits)
    $citizenId = ([System.Text.Encoding]::ASCII.GetString($cidB) -replace '[^\d]','')
    if ($citizenId.Length -gt 13) { $citizenId = $citizenId.Substring(0, 13) }

    # Parse Thai name: Title#FirstName#LastName
    $thFull  = Decode-TIS620 $thB
    $thParts = @($thFull.Split('#') | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne '' })
    $titleTH     = if ($thParts.Count -ge 1) { $thParts[0] } else { '' }
    $firstNameTH = if ($thParts.Count -ge 2) { $thParts[1] } else { '' }
    $lastNameTH  = if ($thParts.Count -ge 3) { $thParts[2] } else { '' }

    # Parse English name: Title#FirstName#LastName or FirstName#LastName
    $enFull  = ([System.Text.Encoding]::ASCII.GetString($enB) -replace '[^\x20-\x7E]','').Trim()
    $enParts = @($enFull.Split('#') | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne '' })
    $firstNameEN = ''; $lastNameEN = ''
    if     ($enParts.Count -ge 3) { $firstNameEN = $enParts[1]; $lastNameEN = $enParts[2] }
    elseif ($enParts.Count -eq 2) { $firstNameEN = $enParts[0]; $lastNameEN = $enParts[1] }
    elseif ($enParts.Count -eq 1) { $firstNameEN = $enParts[0] }

    # Gender: 0x31='1'=Male, 0x32='2'=Female
    $gb = $genB[0]
    $gender = if ($gb -eq 0x31) {
        -join [char[]](0x0E0A, 0x0E32, 0x0E22)          # ชาย
    } elseif ($gb -eq 0x32) {
        -join [char[]](0x0E2B, 0x0E0D, 0x0E34, 0x0E07)  # หญิง
    } else {
        -join [char[]](0x0E44,0x0E21,0x0E48,0x0E23,0x0E30,0x0E1A,0x0E38)  # ไม่ระบุ
    }

    $out = [ordered]@{
        ok   = $true
        data = [ordered]@{
            citizenId   = $citizenId
            titleTH     = $titleTH
            firstNameTH = $firstNameTH
            lastNameTH  = $lastNameTH
            firstNameEN = $firstNameEN
            lastNameEN  = $lastNameEN
            dob         = Format-Date $dobB
            gender      = $gender
            address     = Decode-TIS620 $adB
            issueDate   = Format-Date $issB
            expireDate  = Format-Date $expB
        }
    }
    $out | ConvertTo-Json -Depth 3 -Compress

} catch {
    $msg = $_.Exception.Message -replace '"',"'"
    "{`"ok`":false,`"error`":`"$msg`"}"
}
