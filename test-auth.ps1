#!/usr/bin/env pwsh

$baseUrl = "http://localhost:4000/v1"
$phone = "9876543210"

Write-Host "=== Testing Auth Flow ==="

# Step 1: Send OTP
Write-Host "`n1. Sending OTP to $phone..."
$otpResponse = Invoke-RestMethod -Uri "$baseUrl/auth/send-otp" -Method Post -Body (@{phoneNumber=$phone} | ConvertTo-Json) -ContentType "application/json"
Write-Host "Response: $($otpResponse | ConvertTo-Json)"

$debugOtp = $otpResponse.data.debugOtp
if (-not $debugOtp) {
  Write-Host "ERROR: No debugOtp in response"
  exit 1
}

Write-Host "Debug OTP: $debugOtp"

# Step 2: Verify OTP
Write-Host "`n2. Verifying OTP..."
$verifyResponse = Invoke-RestMethod -Uri "$baseUrl/auth/verify-otp" -Method Post -Body (@{phoneNumber=$phone; otp=$debugOtp} | ConvertTo-Json) -ContentType "application/json"
Write-Host "Response: $($verifyResponse | ConvertTo-Json)"

$accessToken = $verifyResponse.data.accessToken
if (-not $accessToken) {
  Write-Host "ERROR: No accessToken in response"
  exit 1
}

Write-Host "Access Token: $accessToken"

# Step 3: Test autocomplete with valid token
Write-Host "`n3. Testing autocomplete with valid token..."
$headers = @{"Authorization" = "Bearer $accessToken"}
$autocompleteResponse = Invoke-RestMethod -Uri "$baseUrl/maps/autocomplete?q=Ahe&lat=23.597752859198174&lng=72.98009682552852" -Method Get -Headers $headers
Write-Host "Response: $($autocompleteResponse | ConvertTo-Json -Depth 10)"

Write-Host "`n=== Test Complete ==="
