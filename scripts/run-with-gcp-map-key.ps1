param(
  [ValidateSet('dev', 'build')]
  [string]$Mode = 'dev'
)

$ErrorActionPreference = 'Stop'
$ProjectId = 'project-7f6f256a-1c2e-4701-8e1'
$KeyResource = 'projects/841350457433/locations/global/keys/2805c34b-6adb-490b-a499-8b1651ac1c0d'

# The browser-restricted key is retrieved from GCP at runtime and is never written to .env or source control.
$MapKey = (gcloud services api-keys get-key-string $KeyResource --project $ProjectId --format='value(keyString)').Trim()
if ([string]::IsNullOrWhiteSpace($MapKey)) { throw 'Could not obtain the NER Sentinel Maps key from GCP.' }

$env:VITE_GOOGLE_MAPS_API_KEY = $MapKey
try {
  if ($Mode -eq 'build') { npm run build } else { npm run dev }
} finally {
  Remove-Item Env:VITE_GOOGLE_MAPS_API_KEY -ErrorAction SilentlyContinue
}
