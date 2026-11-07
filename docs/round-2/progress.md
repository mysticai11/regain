# Regain UI Upgrade Round 2 — Progress & Execution Tracker

## Owner To-Do List (Pending Actions)

- [ ] **Generate Release Keystore**: Run the `keytool` command locally to create `regain-release.jks` (keep this file backed up safely in two offline locations!).
- [ ] **Generate Base64 Keystore String**: Convert `regain-release.jks` to a single-line base64 string.
- [ ] **Configure GitHub Secrets**: In GitHub repository **Settings $\rightarrow$ Secrets and variables $\rightarrow$ Actions**, add:
  - `ANDROID_KEYSTORE_BASE64`
  - `ANDROID_KEYSTORE_PASSWORD`
  - `ANDROID_KEY_ALIAS`
  - `ANDROID_KEY_PASSWORD`
- [ ] **Trigger Build & Compare Fingerprints**: Run the Actions workflow twice and confirm the printed SHA-256 certificate fingerprints in the build summary are identical.
- [ ] **One-Time Uninstall**: Uninstall the previously installed debug APK from your Android test device (required because of key change from debug to release).
- [ ] **Install Signed Release APK**: Install `regain-2.0.0-<run_number>.apk` on device.

---

## Task Status Dashboard

| Task ID | Description | Status | Commit | Test Results | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **R2-1** | Stable APK Signing & Versioning | **PENDING OWNER** | — | — | Awaiting secrets registration |
| **R2-2** | Weekly Stat Tiles (Progress > Body) | **READY** | — | — | Prerequisite: Round 1 |
| **R2-3** | Nutrition 7-Day Bar Chart | **READY** | — | — | Prerequisite: Round 1 |
| **R2-4** | Progressive Overload Hints (Gym) | **READY** | — | — | Prerequisite: Round 1 |
| **R2-5** | App Version Watermark | **READY** | — | — | Prerequisite: Round 1 |
| **R2-6** | Documentation & Verification Report | **READY** | — | — | Final task |

---

## Log of Skipped Items
*None.*

## Log of "Needs Logic Change"
*None.*
