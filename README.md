
# SonicSurge - Music Discovery App

SonicSurge is a Next.js application designed to help users discover new music based on their mood, preferences, or even by analyzing audio snippets. It leverages AI to interpret musical intent and fetches recommendations from the Spotify API.

## Features

-   **Mood-Based Discovery**: Describe your vibe, and SonicSurge finds songs to match.
-   **Advanced Filtering**: Refine your search with song name, artist, and key instruments.
-   **Spotify Integration**: Fetches real song data and recommendations from Spotify.
-   **AI-Powered Intent Interpretation**: Uses Genkit with Gemini to translate user input into actionable search parameters.
-   **In-App Playback**: Listen to song previews directly within the app using Spotify's embedded player.
-   **Responsive Design**: Adapts to various screen sizes for a seamless experience.

## Prerequisites

Before you begin, ensure you have the following installed:

-   [Node.js](https://nodejs.org/) (v18 or later recommended)
-   [npm](https://www.npmjs.com/) (v9 or later) or [yarn](https://yarnpkg.com/)
-   [Google Cloud CLI](https://cloud.google.com/sdk/docs/install) (for Genkit/Gemini integration, specifically for local development authentication)

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/sonicsurge.git # Replace with your repo URL
cd sonicsurge
```

### 2. Install Dependencies

```bash
npm install
# or
# yarn install
```

### 3. Set Up Environment Variables

SonicSurge requires API keys for Spotify and configuration for Google AI (Gemini).

-   Copy the example environment file:
    ```bash
    cp .env.example .env
    ```
-   Open the `.env` file and fill in your credentials:
    -   `SPOTIFY_CLIENT_ID`: Your Spotify application Client ID.
    -   `SPOTIFY_CLIENT_SECRET`: Your Spotify application Client Secret.
    -   You can get these from the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/).
    -   `GOOGLE_API_KEY` (Optional): If you are not using Google Cloud Application Default Credentials (ADC), you can provide a Google API key for Gemini access.

-   **Google Cloud / Genkit Authentication (for Gemini)**:
    For local development, Genkit typically uses Application Default Credentials (ADC).
    1.  Ensure you have the Google Cloud CLI installed.
    2.  Log in and set up ADC:
        ```bash
        gcloud auth application-default login
        ```
    3.  Make sure your Google Cloud project has the "Vertex AI API" enabled and your ADC user has the "Vertex AI User" role or equivalent permissions. If you choose to use a `GOOGLE_API_KEY` instead, ensure it's enabled for the Gemini API.

### 4. Run the Development Servers

SonicSurge uses Next.js for the frontend and Genkit for the AI backend. You'll need to run both concurrently in separate terminal windows.

-   **Terminal 1: Next.js Frontend**
    ```bash
    npm run dev
    ```
    This will start the Next.js development server, usually on `http://localhost:9002`.

-   **Terminal 2: Genkit AI Backend**
    ```bash
    npm run genkit:dev
    ```
    This will start the Genkit development server, typically on `http://localhost:3400` (for the Genkit developer UI) and `http://localhost:4000` (for flows if exposed via Express, though this app uses Next.js server actions primarily). The Genkit CLI will show you the relevant ports.

    Alternatively, for auto-reloading of Genkit flows on changes:
    ```bash
    npm run genkit:watch
    ```

### 5. Open the App

Navigate to `http://localhost:9002` (or the port Next.js is running on) in your browser.

## In-App Listening

SonicSurge allows you to listen to song previews directly within the app.
- In the song results table, each track will have a "Listen" button.
- Clicking this button will toggle an embedded Spotify player for that specific track.
- The player appears directly below the song row and allows you to play a ~30-second preview (standard for Spotify embeds without premium user login).
- Click "Close" (which the "Listen" button changes to) to hide the player.

This feature uses Spotify's standard iframe embed and does not require any additional environment variables beyond your `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` for fetching track recommendations.

## Available Scripts

-   `npm run dev`: Starts the Next.js development server (with Turbopack).
-   `npm run genkit:dev`: Starts the Genkit development server.
-   `npm run genkit:watch`: Starts the Genkit development server with auto-reloading.
-   `npm run build`: Builds the application for production.
-   `npm run start`: Starts a Next.js production server (after running `npm run build`).
-   `npm run lint`: Lints the codebase using Next.js's built-in ESLint configuration.
-   `npm run typecheck`: Runs TypeScript type checking.

## Building for Production

To build the application for production, run:

```bash
npm run build
```

This command will create an optimized build of your Next.js application in the `.next` directory.

## Deployment

This application is configured for deployment on [Firebase App Hosting](https://firebase.google.com/docs/app-hosting). The `apphosting.yaml` file contains the basic configuration.

To deploy:

1.  Ensure you have the Firebase CLI installed and configured: `npm install -g firebase-tools`.
2.  Log in to Firebase: `firebase login`.
3.  Initialize Firebase in your project if you haven't already: `firebase init apphosting`.
4.  Set up your backend in Firebase App Hosting.
5.  Deploy: `firebase apphosting:backends:deploy`.

Make sure to configure your environment variables (Spotify Client ID/Secret, optionally Google API Key) in the Firebase App Hosting environment settings. For Google Cloud services like Gemini, ensure the App Hosting service account has the necessary IAM permissions (e.g., "Vertex AI User").

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Project Structure Notes

-   `.idx/`: This directory is used by Firebase Studio or related Firebase emulators for storing local development data. It is ignored by Git.
-   `.modified`: This file is a marker used by some development environments or tools to track changes. It is ignored by Git.
-   `src/ai/`: Contains Genkit flows and AI-related logic.
-   `src/actions/`: Holds Next.js Server Actions.
-   `src/components/`: React components, including UI elements from ShadCN.
-   `src/services/`: Service integrations, like the Spotify service.
-   `src/app/`: Next.js App Router pages and layouts.

```
