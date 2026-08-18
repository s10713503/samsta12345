# Android signing keys (com.samsta.app)

## 1. Current release / upload keystore (generated for Play Console)

Downloadable artifacts:

| File | Purpose |
| --- | --- |
| `samsta-release.keystore` | PKCS12 keystore used to sign the AAB/APK |
| `samsta-upload-certificate.pem` | Upload certificate (X.509 PEM) for Play Console |
| `samsta-release-private-key.pem` | Raw RSA private key backup |
| `samsta-keystore-credentials.txt` | Alias + store/key passwords |

| Field | Value |
| --- | --- |
| Key alias | `samsta` |
| Store type | PKCS12 |
| Store password | `Samsta@2026Key` |
| Key password | `Samsta@2026Key` |
| Key algorithm | RSA 4096 |
| Signature algorithm | SHA384withRSA |
| Validity | 18 Aug 2026 → 10 Aug 2056 |
| Distinguished name | `CN=Samsta, OU=Mobile, O=Samsta, L=Kolkata, ST=West Bengal, C=IN` |

Fingerprints (all types):

- MD5: `D4:B5:64:A2:9A:C2:35:64:3C:C7:70:0E:84:99:46:E8`
- SHA-1: `D6:A0:A3:04:3A:2A:50:08:F6:2D:FC:C0:BC:76:12:67:91:A5:B2:CD`
- SHA-256: `86:D2:EC:AE:91:FA:1E:84:88:D3:60:39:46:F8:E5:C4:B4:86:3A:9C:C0:5C:B3:F1:18:6F:7A:27:84:08:1E:BA`

Use SHA-1 for Google Cloud OAuth / Firebase Android clients and SHA-256 for
App Links (already in `public/.well-known/assetlinks.json`).

Verify locally:

```bash
keytool -list -v -keystore samsta-release.keystore -storepass 'Samsta@2026Key'
openssl x509 -in samsta-upload-certificate.pem -noout -fingerprint -sha256
```

## 2. Previous keystores (kept in assetlinks for transition)

- SHA-256: `56:7E:B2:28:37:F3:C8:B1:BA:FF:40:1C:2D:E2:6A:8B:DD:9F:44:4B:15:68:3E:63:01:B4:B9:96:71:D1:EC:2F`
  (SHA-1 `95:44:13:CE:2B:1A:83:6E:88:80:32:BF:A8:1B:6A:84:E6:AA:71:D8`,
  MD5 `82:E0:40:4C:27:9A:F4:E5:AD:70:CF:C4:E2:C8:9A:55`)
- SHA-256: `D6:E7:E4:00:EC:69:70:D1:22:AC:37:E0:9F:46:5B:BA:F2:4C:6C:A4:B8:39:CD:8F:06:B6:EF:88:19:2E:C0:95`
  (SHA-1 `AC:28:C6:F0:5C:50:05:DB:32:4D:35:A8:7E:EE:EA:C5:6E:60:D3:9D`,
  MD5 `C5:35:27:9F:96:B1:44:21:AC:90:C6:63:DB:F2:94:6C`)

## 3. Play App Signing

With Play App Signing the key above is your **upload key**. Upload
`samsta-upload-certificate.pem` in Play Console → Setup → App integrity, then
also add Play's own "App signing key certificate" SHA-256 to
`public/.well-known/assetlinks.json`.

## 4. Release signing configuration

`android/keystore.properties` (git-ignored):

```properties
storeFile=/absolute/path/to/samsta-release.keystore
storePassword=Samsta@2026Key
keyAlias=samsta
keyPassword=Samsta@2026Key
```

`android/app/build.gradle`:

```gradle
def keystorePropsFile = rootProject.file("keystore.properties")
def keystoreProps = new Properties()
if (keystorePropsFile.exists()) {
    keystoreProps.load(new FileInputStream(keystorePropsFile))
}

android {
    namespace "com.samsta.app"

    signingConfigs {
        release {
            storeFile file(keystoreProps["storeFile"])
            storePassword keystoreProps["storePassword"]
            keyAlias keystoreProps["keyAlias"]
            keyPassword keystoreProps["keyPassword"]
            v1SigningEnabled true
            v2SigningEnabled true
        }
    }

    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
        }
    }
}
```

Build the bundle:

```bash
./gradlew bundleRelease   # app/build/outputs/bundle/release/app-release.aab
```

Or with Bubblewrap (uses `docs/twa-manifest.json`):

```bash
bubblewrap build --skipPwaValidation
```
