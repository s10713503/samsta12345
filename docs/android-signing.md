# Android signing key (com.samsta.app)

Keystore certificate fingerprints, stored exactly as provided:

- MD5: `C5:35:27:9F:96:B1:44:21:AC:90:C6:63:DB:F2:94:6C`
- SHA-1: `AC:28:C6:F0:5C:50:05:DB:32:4D:35:A8:7E:EE:EA:C5:6E:60:D3:9D`
- SHA-256: `D6:E7:E4:00:EC:69:70:D1:22:AC:37:E0:9F:46:5B:BA:F2:4C:6C:A4:B8:39:CD:8F:06:B6:EF:88:19:2E:C0:95`

The SHA-256 value is used verbatim in `public/.well-known/assetlinks.json`
for Android App Links / Trusted Web Activity verification.

## Release signing configuration

This repository holds the web app only; the Android wrapper (Trusted Web
Activity) is built separately. Use this configuration there so the **release**
build is signed with the same keystore that produced the fingerprints above.

### 1. Keystore credentials (never commit the keystore or passwords)

`android/keystore.properties` (git-ignored):

```properties
storeFile=/absolute/path/to/samsta-release.keystore
storePassword=<store password>
keyAlias=<key alias>
keyPassword=<key password>
```

### 2. Gradle release signing (`android/app/build.gradle`)

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

Debug builds keep the default debug keystore; only `release` (and any bundle
task) must use the config above, so Play Console and App Links keep matching
the SHA-256 fingerprint in `assetlinks.json`.

### 3. Bubblewrap

If the wrapper is generated with Bubblewrap, keep `twa-manifest.json` in sync
(see `docs/twa-manifest.json` in this repo as the reference copy) — the
`signingKey` block must point at the same keystore and alias.

### 4. Verify before publishing

```bash
# Fingerprints of the keystore
keytool -list -v -keystore /absolute/path/to/samsta-release.keystore -alias <key alias>

# Fingerprint actually embedded in the built artifact
apksigner verify --print-certs app-release.apk
```

Both must print SHA-256
`D6:E7:E4:00:EC:69:70:D1:22:AC:37:E0:9F:46:5B:BA:F2:4C:6C:A4:B8:39:CD:8F:06:B6:EF:88:19:2E:C0:95`.
If they differ, the release was signed with the wrong keystore and App Links
verification will fail.
