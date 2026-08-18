# Android signing keys (com.samsta.app)

## 1. NEW release keystore (generated for Play Console)

File: `samsta-release.keystore` (download it from the artifact panel and store it
safely — it can never be regenerated).

| Field | Value |
| --- | --- |
| Keystore file | `samsta-release.keystore` |
| Store type | PKCS12 |
| Key alias | `samsta` |
| Store password | `lMRNbdmF14Tl1bKZlqle` |
| Key password | `lMRNbdmF14Tl1bKZlqle` |
| Key algorithm | RSA 4096 |
| Signature algorithm | SHA384withRSA |
| Validity | 18 Aug 2026 → 10 Aug 2056 (10950 days) |
| Distinguished name | `CN=Samsta, OU=Mobile, O=Samsta, L=Kolkata, ST=West Bengal, C=IN` |

Fingerprints of the new keystore:

- MD5: `82:E0:40:4C:27:9A:F4:E5:AD:70:CF:C4:E2:C8:9A:55`
- SHA-1: `95:44:13:CE:2B:1A:83:6E:88:80:32:BF:A8:1B:6A:84:E6:AA:71:D8`
- SHA-256: `56:7E:B2:28:37:F3:C8:B1:BA:FF:40:1C:2D:E2:6A:8B:DD:9F:44:4B:15:68:3E:63:01:B4:B9:96:71:D1:EC:2F`

Use the SHA-1 for Google Cloud OAuth / Firebase Android clients, and the SHA-256
for App Links (already added to `public/.well-known/assetlinks.json`).

## 2. Previous keystore fingerprints (kept for reference)

- MD5: `C5:35:27:9F:96:B1:44:21:AC:90:C6:63:DB:F2:94:6C`
- SHA-1: `AC:28:C6:F0:5C:50:05:DB:32:4D:35:A8:7E:EE:EA:C5:6E:60:D3:9D`
- SHA-256: `D6:E7:E4:00:EC:69:70:D1:22:AC:37:E0:9F:46:5B:BA:F2:4C:6C:A4:B8:39:CD:8F:06:B6:EF:88:19:2E:C0:95`

Both SHA-256 values are listed in `assetlinks.json` so either signing key
verifies App Links during the transition.

## 3. Play App Signing note

If Play App Signing is enabled, the key above becomes your **upload key**. Play
then re-signs the app with its own key, and you must ALSO add the
"App signing key certificate" SHA-256 shown in
Play Console → Setup → App integrity to `assetlinks.json`.

## 4. Release signing configuration

`android/keystore.properties` (git-ignored):

```properties
storeFile=/absolute/path/to/samsta-release.keystore
storePassword=lMRNbdmF14Tl1bKZlqle
keyAlias=samsta
keyPassword=lMRNbdmF14Tl1bKZlqle
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
            minifyEnabled false
        }
    }
}
```

## 5. Build the AAB

```bash
./gradlew bundleRelease
# output: android/app/build/outputs/bundle/release/app-release.aab
```

Bubblewrap alternative (see `docs/twa-manifest.json`):

```bash
bubblewrap build   # produces app-release-bundle.aab signed with the keystore above
```

## 6. Verify before publishing

```bash
keytool -list -v -keystore samsta-release.keystore -alias samsta
apksigner verify --print-certs app-release.apk
```

Both must print SHA-256
`56:7E:B2:28:37:F3:C8:B1:BA:FF:40:1C:2D:E2:6A:8B:DD:9F:44:4B:15:68:3E:63:01:B4:B9:96:71:D1:EC:2F`.
