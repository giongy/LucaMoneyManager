plugins {
    id("com.android.application")
}

android {
    namespace = "com.example.luca_wallet"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.example.luca_wallet"
        minSdk = 26
        targetSdk = 35
        versionCode = 3
        versionName = "2.1"
    }

    signingConfigs {
        create("release") {
            storeFile     = file("lucamoney.keystore")
            storePassword = "lucamoney123"
            keyAlias      = "lucamoney"
            keyPassword   = "lucamoney123"
            storeType     = "PKCS12"
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("release")
        }
    }

    // Vale anche per Kotlin: con Kotlin integrato (AGP 9) il target della JVM segue
    // targetCompatibility, senza un blocco a parte da tenere allineato.
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_21
        targetCompatibility = JavaVersion.VERSION_21
    }
}

dependencies {
    implementation("androidx.appcompat:appcompat:1.8.0")
    implementation("com.google.android.material:material:1.14.0")
    implementation("androidx.recyclerview:recyclerview:1.4.0")
    implementation("androidx.swiperefreshlayout:swiperefreshlayout:1.2.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.11.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.9.4")
    implementation("androidx.activity:activity-ktx:1.10.1")
    implementation("androidx.work:work-runtime-ktx:2.10.5")
}
