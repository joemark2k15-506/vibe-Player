# Vibe Player 🎵

_(A High-Fidelity Audiophile React Native Music Player)_

> [!WARNING] > **🚧 WORK IN PROGRESS (WIP) 🚧**
>
> This project is currently in **Active Development**. Features are being added and refined daily. Some components may be incomplete or subject to change.

<div align="center">

# 📲 [Download Latest Release](https://github.com/joemark2k15-506/vibe-Player/raw/main/VibePlayer-Release.apk)

**(Direct APK Download)**

</div>
<div align="center">

### ✨ New in v1.0.0

**Fixed Lockscreen Controls • Custom Notification Fonts • Optimized Scanning • Native Splash Screen**

</div>

Welcome to **Vibe Player**, an advanced mobile music application built with React Native & Expo, focusing on premium UI design and high-performance audio engine capabilities.

## ✨ Key Features

### 🚀 Advanced Audio Engine

- **FFmpeg Integration**: Built-in `ffmpeg-kit-react-native` pipeline to transcode high-res audio (ALAC/M4A) to MP3 on-the-fly, ensuring 100% playback compatibility.
- **Metadata Parsing**: Custom binary parser for extracting ID3 tags and cover art from large files without OOM crashes.
- **Smart Caching**: Persistent metadata caching layer for instant library loading.

### 🎨 Premium UI/UX

- **Interactive Animations**: Custom code-based animations (Sun, Moon, Cloud) using `react-native-reanimated` (No Lottie files!).
- **Immersive Mode**: Dynamic background color extraction (`react-native-image-colors`) that adapts the UI to the current song's album art.
- **Glassmorphism**: Optimized translucent effects (Solid Glass on Android 12+ for performance, Blur on iOS).
- **Music Director Info**: Displays director details alongside artist information.

### ⚡ Performance

- **Optimized Rendering**: Re-architected rendering for 60fps scrolling on Android.
- **Marquee Titles**: Scrolling text for long song names in the MiniPlayer.

## 🛠 Tech Stack

- **Core**: React Native (0.76), Expo (SDK 52), TypeScript
- **Audio**: Expo AV, FFmpeg-Kit (Full-GPL)
- **Animations**: React Native Reanimated 3
- **Navigation**: Expo Router (File-based)
- **State Management**: React Context + Hooks

## 📦 Installation & Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/joemark2k15-506/vibe-Player.git
   cd vibe-Player
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Prebuild (Crucial for FFmpeg)**
   Since we use custom native code for FFmpeg, you **must** run prebuild:

   ```bash
   npx expo prebuild --clean --platform android
   ```

4. **Run on Android**
   ```bash
   npx expo run:android
   ```

## 📱 Building Release APK

To build a standalone APK for testing:

```bash
cd android
./gradlew assembleRelease
```

The APK will be generated at: `android/app/build/outputs/apk/release/app-release.apk`

## 🤝 Contributing

1. Fork the repo
2. Create feature branch
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch
5. Open a Pull Request

---

_Built with ❤️ by Joe_
