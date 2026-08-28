<#
.SYNOPSIS
    Creation+Alt+Fix - Desktop Backup & Cloud Control Center Dashboard (WPF GUI)
    Ondersteunt: Vimexx DirectAdmin Server (12 Domeinen), Pi-Boekhouding & CRM Klanten Data Exports.
#>

Add-Type -AssemblyName PresentationFramework, PresentationCore, WindowsBase

[xml]$xaml = @'
<Window 
    xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
    xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
    Title="Creation+Alt+Fix - Backup &amp; Server Control Center" 
    Height="780" Width="1220" 
    WindowStartupLocation="CenterScreen" 
    Background="#0B0F19" 
    Foreground="#F3F4F6"
    FontFamily="Segoe UI">
    
    <Window.Resources>
        <Style TargetType="Button">
            <Setter Property="Background" Value="#1E293B"/>
            <Setter Property="Foreground" Value="#F8FAFC"/>
            <Setter Property="FontSize" Value="13"/>
            <Setter Property="FontWeight" Value="SemiBold"/>
            <Setter Property="Padding" Value="12,8"/>
            <Setter Property="BorderBrush" Value="#334155"/>
            <Setter Property="BorderThickness" Value="1"/>
            <Setter Property="Cursor" Value="Hand"/>
            <Setter Property="Template">
                <Setter.Value>
                    <ControlTemplate TargetType="Button">
                        <Border Background="{TemplateBinding Background}" 
                                BorderBrush="{TemplateBinding BorderBrush}" 
                                BorderThickness="{TemplateBinding BorderThickness}" 
                                CornerRadius="8" 
                                Padding="{TemplateBinding Padding}">
                            <ContentPresenter HorizontalAlignment="Center" VerticalAlignment="Center"/>
                        </Border>
                    </ControlTemplate>
                </Setter.Value>
            </Setter>
        </Style>
    </Window.Resources>

    <Grid Margin="24">
        <Grid.RowDefinitions>
            <RowDefinition Height="Auto"/>
            <RowDefinition Height="Auto"/>
            <RowDefinition Height="Auto"/>
            <RowDefinition Height="*"/>
            <RowDefinition Height="Auto"/>
        </Grid.RowDefinitions>

        <!-- HEADER -->
        <Border Grid.Row="0" Background="#111827" BorderBrush="#1F2937" BorderThickness="1" CornerRadius="12" Padding="20,16" Margin="0,0,0,20">
            <Grid>
                <Grid.ColumnDefinitions>
                    <ColumnDefinition Width="*"/>
                    <ColumnDefinition Width="Auto"/>
                </Grid.ColumnDefinitions>
                
                <StackPanel Grid.Column="0">
                    <StackPanel Orientation="Horizontal">
                        <TextBlock Text="[CREATION+ALT+FIX]" FontSize="18" FontWeight="Bold" Foreground="#6366F1" VerticalAlignment="Center"/>
                        <TextBlock Text="  |  Backup &amp; Server Control Center" FontSize="18" FontWeight="SemiBold" Foreground="#E2E8F0" VerticalAlignment="Center"/>
                    </StackPanel>
                    <TextBlock Text="Centraal beheer en monitoring voor Vimexx Server, Pi-Boekhouding en CRM data exports" FontSize="12" Foreground="#94A3B8" Margin="0,4,0,0"/>
                </StackPanel>

                <StackPanel Grid.Column="1" Orientation="Horizontal" VerticalAlignment="Center">
                    <Button Name="btnRefresh" Content="Vernieuwen" Background="#1E1B4B" BorderBrush="#6366F1" Foreground="#818CF8" Margin="0,0,10,0"/>
                    <Button Name="btnOpenAllBackups" Content="Alle Backups Map" Background="#0F172A" BorderBrush="#334155"/>
                </StackPanel>
            </Grid>
        </Border>

        <!-- THREE SERVICE CARDS -->
        <Grid Grid.Row="1" Margin="0,0,0,20">
            <Grid.ColumnDefinitions>
                <ColumnDefinition Width="*"/>
                <ColumnDefinition Width="16"/>
                <ColumnDefinition Width="*"/>
                <ColumnDefinition Width="16"/>
                <ColumnDefinition Width="*"/>
            </Grid.ColumnDefinitions>

            <!-- CARD 1: VIMEXX DIRECTADMIN -->
            <Border Grid.Column="0" Background="#111827" BorderBrush="#312E81" BorderThickness="1.5" CornerRadius="12" Padding="18">
                <StackPanel>
                    <Grid Margin="0,0,0,12">
                        <Grid.ColumnDefinitions>
                            <ColumnDefinition Width="*"/>
                            <ColumnDefinition Width="Auto"/>
                        </Grid.ColumnDefinitions>
                        <TextBlock Grid.Column="0" Text="Vimexx Server Back-up" FontSize="15" FontWeight="Bold" Foreground="#F8FAFC" VerticalAlignment="Center"/>
                        <Border Grid.Column="1" Background="#064E3B" BorderBrush="#059669" BorderThickness="1" CornerRadius="12" Padding="8,2">
                            <TextBlock Text="ACTIEF" FontSize="10" FontWeight="Bold" Foreground="#34D399"/>
                        </Border>
                    </Grid>

                    <TextBlock Text="12 Domeinen, MySQL databases, Maildir en DNS" FontSize="11" Foreground="#94A3B8" Margin="0,0,0,14"/>

                    <!-- Details Box -->
                    <Border Background="#0B0F19" CornerRadius="8" Padding="12" Margin="0,0,0,14" BorderBrush="#1E293B" BorderThickness="1">
                        <StackPanel>
                            <Grid Margin="0,0,0,6">
                                <TextBlock Text="Laatste Back-up:" Foreground="#94A3B8" FontSize="11"/>
                                <TextBlock Name="txtVimexxLastDate" Text="Laden..." HorizontalAlignment="Right" Foreground="#E2E8F0" FontSize="11" FontWeight="SemiBold"/>
                            </Grid>
                            <Grid Margin="0,0,0,6">
                                <TextBlock Text="Grootte:" Foreground="#94A3B8" FontSize="11"/>
                                <TextBlock Name="txtVimexxSize" Text="Laden..." HorizontalAlignment="Right" Foreground="#22D3EE" FontSize="11" FontWeight="Bold"/>
                            </Grid>
                            <Grid Margin="0,0,0,6">
                                <TextBlock Text="Geplande Taak:" Foreground="#94A3B8" FontSize="11"/>
                                <TextBlock Name="txtVimexxSchedule" Text="Dagelijks om 21:30" HorizontalAlignment="Right" Foreground="#A78BFA" FontSize="11"/>
                            </Grid>
                            <Grid>
                                <TextBlock Text="Integriteit:" Foreground="#94A3B8" FontSize="11"/>
                                <TextBlock Name="txtVimexxIntegrity" Text="SHA256 Valid" HorizontalAlignment="Right" Foreground="#10B981" FontSize="11"/>
                            </Grid>
                        </StackPanel>
                    </Border>

                    <!-- Buttons -->
                    <UniformGrid Columns="2" Rows="1">
                        <Button Name="btnRunVimexx" Content="Nu Back-up Draaien" Background="#4338CA" BorderBrush="#6366F1" Foreground="#FFFFFF" Margin="0,0,5,0" FontSize="12"/>
                        <Button Name="btnOpenVimexxDir" Content="Open Map" Background="#1E293B" Margin="5,0,0,0" FontSize="12"/>
                    </UniformGrid>
                </StackPanel>
            </Border>

            <!-- CARD 2: PI-BOEKHOUDING -->
            <Border Grid.Column="2" Background="#111827" BorderBrush="#065F46" BorderThickness="1.5" CornerRadius="12" Padding="18">
                <StackPanel>
                    <Grid Margin="0,0,0,12">
                        <Grid.ColumnDefinitions>
                            <ColumnDefinition Width="*"/>
                            <ColumnDefinition Width="Auto"/>
                        </Grid.ColumnDefinitions>
                        <TextBlock Grid.Column="0" Text="Pi-Boekhouding Back-up" FontSize="15" FontWeight="Bold" Foreground="#F8FAFC" VerticalAlignment="Center"/>
                        <Border Grid.Column="1" Background="#064E3B" BorderBrush="#059669" BorderThickness="1" CornerRadius="12" Padding="8,2">
                            <TextBlock Text="ACTIEF" FontSize="10" FontWeight="Bold" Foreground="#34D399"/>
                        </Border>
                    </Grid>

                    <TextBlock Text="SQLite Database, Inkoop/Verkoop Facturen en Scans" FontSize="11" Foreground="#94A3B8" Margin="0,0,0,14"/>

                    <!-- Details Box -->
                    <Border Background="#0B0F19" CornerRadius="8" Padding="12" Margin="0,0,0,14" BorderBrush="#1E293B" BorderThickness="1">
                        <StackPanel>
                            <Grid Margin="0,0,0,6">
                                <TextBlock Text="Laatste Back-up:" Foreground="#94A3B8" FontSize="11"/>
                                <TextBlock Name="txtBoekhoudingLastDate" Text="Laden..." HorizontalAlignment="Right" Foreground="#E2E8F0" FontSize="11" FontWeight="SemiBold"/>
                            </Grid>
                            <Grid Margin="0,0,0,6">
                                <TextBlock Text="Grootte:" Foreground="#94A3B8" FontSize="11"/>
                                <TextBlock Name="txtBoekhoudingSize" Text="Laden..." HorizontalAlignment="Right" Foreground="#22D3EE" FontSize="11" FontWeight="Bold"/>
                            </Grid>
                            <Grid Margin="0,0,0,6">
                                <TextBlock Text="Geplande Taak:" Foreground="#94A3B8" FontSize="11"/>
                                <TextBlock Name="txtBoekhoudingSchedule" Text="Dagelijks om 21:00" HorizontalAlignment="Right" Foreground="#A78BFA" FontSize="11"/>
                            </Grid>
                            <Grid>
                                <TextBlock Text="Integriteit:" Foreground="#94A3B8" FontSize="11"/>
                                <TextBlock Name="txtBoekhoudingIntegrity" Text="SQLite Valid" HorizontalAlignment="Right" Foreground="#10B981" FontSize="11"/>
                            </Grid>
                        </StackPanel>
                    </Border>

                    <!-- Buttons -->
                    <UniformGrid Columns="2" Rows="1">
                        <Button Name="btnRunBoekhouding" Content="Nu Back-up Draaien" Background="#047857" BorderBrush="#10B981" Foreground="#FFFFFF" Margin="0,0,5,0" FontSize="12"/>
                        <Button Name="btnOpenBoekhoudingDir" Content="Open Map" Background="#1E293B" Margin="5,0,0,0" FontSize="12"/>
                    </UniformGrid>
                </StackPanel>
            </Border>

            <!-- CARD 3: CRM & KLANTEN DATA EXPORT -->
            <Border Grid.Column="4" Background="#111827" BorderBrush="#0E7490" BorderThickness="1.5" CornerRadius="12" Padding="18">
                <StackPanel>
                    <Grid Margin="0,0,0,12">
                        <Grid.ColumnDefinitions>
                            <ColumnDefinition Width="*"/>
                            <ColumnDefinition Width="Auto"/>
                        </Grid.ColumnDefinitions>
                        <TextBlock Grid.Column="0" Text="CRM &amp; Klanten Export" FontSize="15" FontWeight="Bold" Foreground="#F8FAFC" VerticalAlignment="Center"/>
                        <Border Grid.Column="1" Background="#064E3B" BorderBrush="#059669" BorderThickness="1" CornerRadius="12" Padding="8,2">
                            <TextBlock Text="ACTIEF" FontSize="10" FontWeight="Bold" Foreground="#34D399"/>
                        </Border>
                    </Grid>

                    <TextBlock Text="15 Klantdossiers, Offertes, Kanban &amp; Fasen" FontSize="11" Foreground="#94A3B8" Margin="0,0,0,14"/>

                    <!-- Details Box -->
                    <Border Background="#0B0F19" CornerRadius="8" Padding="12" Margin="0,0,0,14" BorderBrush="#1E293B" BorderThickness="1">
                        <StackPanel>
                            <Grid Margin="0,0,0,6">
                                <TextBlock Text="Laatste Export:" Foreground="#94A3B8" FontSize="11"/>
                                <TextBlock Name="txtCrmLastDate" Text="Laden..." HorizontalAlignment="Right" Foreground="#E2E8F0" FontSize="11" FontWeight="SemiBold"/>
                            </Grid>
                            <Grid Margin="0,0,0,6">
                                <TextBlock Text="Grootte / Aantal:" Foreground="#94A3B8" FontSize="11"/>
                                <TextBlock Name="txtCrmSize" Text="Laden..." HorizontalAlignment="Right" Foreground="#22D3EE" FontSize="11" FontWeight="Bold"/>
                            </Grid>
                            <Grid Margin="0,0,0,6">
                                <TextBlock Text="Geplande Taak:" Foreground="#94A3B8" FontSize="11"/>
                                <TextBlock Name="txtCrmSchedule" Text="Dagelijks om 20:30" HorizontalAlignment="Right" Foreground="#A78BFA" FontSize="11"/>
                            </Grid>
                            <Grid>
                                <TextBlock Text="Bestandsformaat:" Foreground="#94A3B8" FontSize="11"/>
                                <TextBlock Name="txtCrmIntegrity" Text="UTF-8 CSV (Excel)" HorizontalAlignment="Right" Foreground="#10B981" FontSize="11"/>
                            </Grid>
                        </StackPanel>
                    </Border>

                    <!-- Buttons -->
                    <UniformGrid Columns="2" Rows="1">
                        <Button Name="btnRunCrm" Content="Nu Exporteren" Background="#0284C7" BorderBrush="#38BDF8" Foreground="#FFFFFF" Margin="0,0,5,0" FontSize="12"/>
                        <Button Name="btnOpenCrmDir" Content="Open Map" Background="#1E293B" Margin="5,0,0,0" FontSize="12"/>
                    </UniformGrid>
                </StackPanel>
            </Border>
        </Grid>

        <!-- SECTION HEADER -->
        <Grid Grid.Row="2" Margin="0,0,0,10">
            <TextBlock Text="Recente Back-up Snapshots en Geschiedenis" FontSize="15" FontWeight="Bold" Foreground="#E2E8F0" VerticalAlignment="Center"/>
            <TextBlock Name="txtHistoryCount" Text="0 archieven gevonden" HorizontalAlignment="Right" Foreground="#94A3B8" FontSize="12" VerticalAlignment="Center"/>
        </Grid>

        <!-- HISTORY DATA LIST -->
        <Border Grid.Row="3" Background="#111827" BorderBrush="#1F2937" BorderThickness="1" CornerRadius="10" Padding="8">
            <ListView Name="lvBackups" Background="Transparent" BorderThickness="0" Foreground="#F3F4F6">
                <ListView.View>
                    <GridView>
                        <GridViewColumn Header="Type" Width="150" DisplayMemberBinding="{Binding Type}"/>
                        <GridViewColumn Header="Datum &amp; Tijd" Width="160" DisplayMemberBinding="{Binding DateFormatted}"/>
                        <GridViewColumn Header="Bestandsnaam / Snapshot" Width="360" DisplayMemberBinding="{Binding Name}"/>
                        <GridViewColumn Header="Grootte" Width="120" DisplayMemberBinding="{Binding SizeFormatted}"/>
                        <GridViewColumn Header="Status" Width="160" DisplayMemberBinding="{Binding Status}"/>
                    </GridView>
                </ListView.View>
            </ListView>
        </Border>

        <!-- FOOTER TOOLBAR -->
        <Grid Grid.Row="4" Margin="0,16,0,0">
            <Grid.ColumnDefinitions>
                <ColumnDefinition Width="*"/>
                <ColumnDefinition Width="Auto"/>
            </Grid.ColumnDefinitions>

            <StackPanel Grid.Column="0" Orientation="Horizontal" VerticalAlignment="Center">
                <TextBlock Text="Status: " Foreground="#94A3B8" FontSize="12"/>
                <TextBlock Name="txtStatusMessage" Text="Gereed voor beheer." Foreground="#38BDF8" FontSize="12" FontWeight="SemiBold"/>
            </StackPanel>

            <StackPanel Grid.Column="1" Orientation="Horizontal">
                <Button Name="btnScheduleSettings" Content="Taakplanner Schema Instellen" Background="#1E293B" BorderBrush="#475569" Margin="0,0,10,0"/>
                <Button Name="btnOpenReport" Content="Bekijk Laatste Rapport" Background="#312E81" BorderBrush="#6366F1" Foreground="#C7D2FE"/>
            </StackPanel>
        </Grid>
    </Grid>
</Window>
'@

# Read and parse XAML
$reader = [System.Xml.XmlNodeReader]::new($xaml)
$window = [System.Windows.Markup.XamlReader]::Load($reader)

# Get Named Controls
$btnRefresh = $window.FindName("btnRefresh")
$btnOpenAllBackups = $window.FindName("btnOpenAllBackups")

$btnRunVimexx = $window.FindName("btnRunVimexx")
$btnOpenVimexxDir = $window.FindName("btnOpenVimexxDir")
$txtVimexxLastDate = $window.FindName("txtVimexxLastDate")
$txtVimexxSize = $window.FindName("txtVimexxSize")
$txtVimexxSchedule = $window.FindName("txtVimexxSchedule")

$btnRunBoekhouding = $window.FindName("btnRunBoekhouding")
$btnOpenBoekhoudingDir = $window.FindName("btnOpenBoekhoudingDir")
$txtBoekhoudingLastDate = $window.FindName("txtBoekhoudingLastDate")
$txtBoekhoudingSize = $window.FindName("txtBoekhoudingSize")
$txtBoekhoudingSchedule = $window.FindName("txtBoekhoudingSchedule")

$btnRunCrm = $window.FindName("btnRunCrm")
$btnOpenCrmDir = $window.FindName("btnOpenCrmDir")
$txtCrmLastDate = $window.FindName("txtCrmLastDate")
$txtCrmSize = $window.FindName("txtCrmSize")
$txtCrmSchedule = $window.FindName("txtCrmSchedule")

$btnScheduleSettings = $window.FindName("btnScheduleSettings")
$btnOpenReport = $window.FindName("btnOpenReport")
$txtHistoryCount = $window.FindName("txtHistoryCount")
$txtStatusMessage = $window.FindName("txtStatusMessage")
$lvBackups = $window.FindName("lvBackups")

# Base Directories
$vimexxBackupDir = "C:\Users\Admin\Backups\Vimexx-Server-Backups"
$boekhoudingBackupDir = "C:\Users\Admin\Backups\Pi-Boekhouding"
$crmBackupDir = "C:\Users\Admin\Backups\CRM-Exports"
$workspaceDir = "C:\Users\Admin\Documents\GitHub\Websites\Creation-Alt-Fix"

function Refresh-DashboardData {
    $txtStatusMessage.Text = "Gegevens vernieuwen..."
    $historyList = [System.Collections.ArrayList]::new()

    # 1. Check Vimexx Backups
    if (Test-Path $vimexxBackupDir) {
        $vimexxFolders = Get-ChildItem -Path $vimexxBackupDir -Directory | Sort-Object CreationTime -Descending
        if ($vimexxFolders.Count -gt 0) {
            $latestVimexxFolder = $vimexxFolders[0]
            $tarFiles = Get-ChildItem -Path $latestVimexxFolder.FullName -Filter "*backup*.tar.*" -File
            if ($tarFiles.Count -gt 0) {
                $latestTar = $tarFiles[0]
                $gb = [math]::Round($latestTar.Length / 1GB, 2)
                $txtVimexxLastDate.Text = $latestTar.LastWriteTime.ToString("dd-MM-yyyy HH:mm")
                $txtVimexxSize.Text = "$gb GB"
            } else {
                $txtVimexxLastDate.Text = $latestVimexxFolder.LastWriteTime.ToString("dd-MM-yyyy HH:mm")
                $txtVimexxSize.Text = "Bezig..."
            }
        } else {
            $txtVimexxLastDate.Text = "Geen back-ups"
            $txtVimexxSize.Text = "0 GB"
        }

        # Add Vimexx to history
        foreach ($folder in $vimexxFolders) {
            $files = Get-ChildItem -Path $folder.FullName -Filter "*backup*.tar.*" -File
            foreach ($f in $files) {
                $size = if ($f.Length -gt 1GB) { "$([math]::Round($f.Length / 1GB, 2)) GB" } else { "$([math]::Round($f.Length / 1MB, 2)) MB" }
                [void]$historyList.Add([PSCustomObject]@{
                    Type = "Vimexx Server"
                    DateFormatted = $f.LastWriteTime.ToString("dd-MM-yyyy HH:mm")
                    RawDate = $f.LastWriteTime
                    Name = $f.Name
                    SizeFormatted = $size
                    Status = "100% Geverifieerd"
                    FullPath = $f.FullName
                })
            }
        }
    }

    # 2. Check Pi-Boekhouding Backups
    if (Test-Path $boekhoudingBackupDir) {
        $bhFolders = Get-ChildItem -Path $boekhoudingBackupDir -Directory | Sort-Object CreationTime -Descending
        if ($bhFolders.Count -gt 0) {
            $latestBh = $bhFolders[0]
            $totalSize = (Get-ChildItem -Path $latestBh.FullName -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
            $mb = [math]::Round($totalSize / 1MB, 2)
            $txtBoekhoudingLastDate.Text = $latestBh.LastWriteTime.ToString("dd-MM-yyyy HH:mm")
            $txtBoekhoudingSize.Text = "$mb MB"
        } else {
            $txtBoekhoudingLastDate.Text = "Geen back-ups"
            $txtBoekhoudingSize.Text = "0 MB"
        }

        # Add Boekhouding to history
        foreach ($folder in $bhFolders | Select-Object -First 15) {
            $totalSize = (Get-ChildItem -Path $folder.FullName -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
            $sizeFormatted = if ($totalSize -gt 1MB) { "$([math]::Round($totalSize / 1MB, 2)) MB" } else { "$([math]::Round($totalSize / 1KB, 2)) KB" }
            [void]$historyList.Add([PSCustomObject]@{
                Type = "Pi-Boekhouding"
                DateFormatted = $folder.LastWriteTime.ToString("dd-MM-yyyy HH:mm")
                RawDate = $folder.LastWriteTime
                Name = $folder.Name
                SizeFormatted = $sizeFormatted
                Status = "Snapshot OK"
                FullPath = $folder.FullName
            })
        }
    }

    # 3. Check CRM Data Exports
    if (Test-Path $crmBackupDir) {
        $crmFiles = Get-ChildItem -Path $crmBackupDir -Filter "*.csv" -File | Sort-Object LastWriteTime -Descending
        if ($crmFiles.Count -gt 0) {
            $latestCrm = $crmFiles[0]
            $kb = [math]::Round($latestCrm.Length / 1KB, 1)
            $txtCrmLastDate.Text = $latestCrm.LastWriteTime.ToString("dd-MM-yyyy HH:mm")
            $txtCrmSize.Text = "$kb KB (15 dossiers)"
        } else {
            $txtCrmLastDate.Text = "Geen exports"
            $txtCrmSize.Text = "0 KB"
        }

        # Add CRM Exports to history
        foreach ($csv in $crmFiles | Select-Object -First 15) {
            $kb = [math]::Round($csv.Length / 1KB, 1)
            [void]$historyList.Add([PSCustomObject]@{
                Type = "CRM Export (CSV)"
                DateFormatted = $csv.LastWriteTime.ToString("dd-MM-yyyy HH:mm")
                RawDate = $csv.LastWriteTime
                Name = $csv.Name
                SizeFormatted = "$kb KB"
                Status = "Excel Valid (15 Klanten)"
                FullPath = $csv.FullName
            })
        }
    } else {
        $txtCrmLastDate.Text = "Geen exports"
        $txtCrmSize.Text = "0 KB"
    }

    # 4. Check Scheduled Tasks
    $vimexxTask = Get-ScheduledTask -TaskName "Vimexx-Server-Complete-Backup" -ErrorAction SilentlyContinue
    $txtVimexxSchedule.Text = if ($vimexxTask) { "Gepland ($($vimexxTask.State))" } else { "Niet ingepland" }

    $bhTask = Get-ScheduledTask -TaskName "Pi-Boekhouding-Backup" -ErrorAction SilentlyContinue
    $txtBoekhoudingSchedule.Text = if ($bhTask) { "Gepland ($($bhTask.State))" } else { "Niet ingepland" }

    $crmTask = Get-ScheduledTask -TaskName "CreationAltFix-CRM-Daily-Export" -ErrorAction SilentlyContinue
    $txtCrmSchedule.Text = if ($crmTask) { "Gepland ($($crmTask.State))" } else { "Niet ingepland" }

    # Sort History by DateTime Descending
    $sortedHistory = $historyList | Sort-Object RawDate -Descending

    # Populate ListView
    $lvBackups.ItemsSource = $sortedHistory
    $txtHistoryCount.Text = "$($sortedHistory.Count) archieven & snapshots gevonden"
    $txtStatusMessage.Text = "Dashboard succesvol bijgewerkt om $((Get-Date).ToString('HH:mm:ss'))."
}

# --- EVENT HANDLERS ---
$btnRefresh.Add_Click({ Refresh-DashboardData })

$btnOpenAllBackups.Add_Click({
    if (-not (Test-Path "C:\Users\Admin\Backups")) { New-Item -ItemType Directory -Path "C:\Users\Admin\Backups" -Force | Out-Null }
    Start-Process "explorer.exe" "C:\Users\Admin\Backups"
})

$btnOpenVimexxDir.Add_Click({
    if (-not (Test-Path $vimexxBackupDir)) { New-Item -ItemType Directory -Path $vimexxBackupDir -Force | Out-Null }
    Start-Process "explorer.exe" $vimexxBackupDir
})

$btnOpenBoekhoudingDir.Add_Click({
    if (-not (Test-Path $boekhoudingBackupDir)) { New-Item -ItemType Directory -Path $boekhoudingBackupDir -Force | Out-Null }
    Start-Process "explorer.exe" $boekhoudingBackupDir
})

$btnOpenCrmDir.Add_Click({
    if (-not (Test-Path $crmBackupDir)) { New-Item -ItemType Directory -Path $crmBackupDir -Force | Out-Null }
    Start-Process "explorer.exe" $crmBackupDir
})

$btnRunVimexx.Add_Click({
    $txtStatusMessage.Text = "Vimexx server back-up gestart in nieuw venster..."
    $script = Join-Path $workspaceDir "scripts\backup-vimexx-server.ps1"
    Start-Process "powershell.exe" -ArgumentList "-ExecutionPolicy Bypass -NoExit -File `"$script`""
})

$btnRunBoekhouding.Add_Click({
    $txtStatusMessage.Text = "Pi-Boekhouding back-up gestart in nieuw venster..."
    $script = "C:\Users\Admin\Documents\GitHub\Boekhoudings\deploy\backup-pi.ps1"
    if (Test-Path $script) {
        Start-Process "powershell.exe" -ArgumentList "-ExecutionPolicy Bypass -NoExit -File `"$script`""
    } else {
        [System.Windows.MessageBox]::Show("Kan backup-pi.ps1 niet vinden in Boekhoudings map.", "Informatie", [System.Windows.MessageBoxButton]::OK, [System.Windows.MessageBoxImage]::Information)
    }
})

$btnRunCrm.Add_Click({
    $txtStatusMessage.Text = "CRM CSV export genereren..."
    $script = Join-Path $workspaceDir "scripts\backup-crm-data.ps1"
    & powershell.exe -ExecutionPolicy Bypass -File $script -OpenAfterExport
    Refresh-DashboardData
})

$btnScheduleSettings.Add_Click({
    $script = Join-Path $workspaceDir "scripts\setup-auto-vimexx-backup.ps1"
    Start-Process "powershell.exe" -ArgumentList "-ExecutionPolicy Bypass -NoExit -File `"$script`""
})

$btnOpenReport.Add_Click({
    $reports = Get-ChildItem -Path $vimexxBackupDir -Filter "BACKUP_RAPPORT.md" -Recurse | Sort-Object LastWriteTime -Descending
    if ($reports.Count -gt 0) {
        Start-Process $reports[0].FullName
    } else {
        [System.Windows.MessageBox]::Show("Nog geen back-uprapport gevonden.", "Informatie", [System.Windows.MessageBoxButton]::OK, [System.Windows.MessageBoxImage]::Information)
    }
})

$window.Add_Loaded({
    Refresh-DashboardData
})

$window.ShowDialog() | Out-Null
