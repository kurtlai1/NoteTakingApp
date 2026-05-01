# NoteTakingApp for UECS3253 Wireless Application Development

NoteTakingApp is a React Native mobile application note manager built with local SQLite storage. It is designed for Android and focuses on fast note capture, organization, and retrieval through favorites, tags, search, and a recycle bin.

## Contributors

- [yongxennzz](https://github.com/yongxennzz)
- [kurtlai1](https://github.com/kurtlai1)
- [kyleyamatoc-bot](https://github.com/kyleyamatoc-bot)
- [Jun-Yin67](https://github.com/Jun-Yin67)

## Features

- Create, edit, and delete notes locally on the device.
- Mark notes as favorites for quick access.
- Organize notes with tags and tag colors.
- Search across saved notes.
- Restore or permanently remove notes from the recycle bin.
- View note detail and editor screens through a nested navigation flow.

## Tech Stack

- React Native 0.80
- TypeScript
- React Navigation
- SQLite via `react-native-sqlite-storage`
- Jest for tests

## Repository Layout

- `App.tsx` - app entry point and navigation container.
- `navigation/` - drawer, tab, and stack navigation setup.
- `screens/` - main app screens.
- `components/` - reusable UI pieces.
- `database/` - SQLite schema and note data access.

## Getting Started

> This repository does not include `node_modules`. Install dependencies locally after cloning.

### Prerequisites

- Node.js 18 or newer
- Android Studio with an Android emulator or a connected Android device
- Java and the Android SDK configured for React Native development

### Install Dependencies

```sh
npm install
```

### Start Metro

```sh
npm start
```

### Run the App on Android

```sh
npm run android
```

If Metro is already running, you can also launch the app from Android Studio after the native build completes.

## Available Scripts

- `npm start` - start the Metro bundler.
- `npm run android` - build and run the Android app.
- `npm run lint` - run ESLint.
- `npm test` - run the Jest test suite.

## Notes

- The app uses a local SQLite database, so notes stay on the device unless the database is cleared.
- The repository is intended for GitHub storage without committing generated folders such as `node_modules`.
- If you are opening the project for the first time, run `npm install` before any build or test command.

## Testing

```sh
npm test
```

## Contributing

This repository is made for UTAR assignment, so any other contributions are not allowed.
