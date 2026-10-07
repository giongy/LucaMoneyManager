// Dall'Android Gradle Plugin 9 Kotlin è integrato: il plugin org.jetbrains.kotlin.android non
// si dichiara più, né qui né nel modulo app. La versione di Kotlin la porterebbe AGP (la minima
// che gli serve); il classpath qui sotto la fissa a una più recente, ed è anche il punto in
// cui Dependabot la tiene aggiornata.
buildscript {
    dependencies {
        classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:2.4.20")
    }
}

plugins {
    id("com.android.application") version "9.4.1" apply false
}
