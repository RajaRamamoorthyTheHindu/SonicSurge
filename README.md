
# SonicSurge - Music Discovery App

SonicSurge is a Next.js application designed to help users discover new music based on their mood, preferences, or even by analyzing audio snippets. It leverages AI to interpret musical intent and fetches recommendations from the Spotify API, with an option to play related videos from YouTube.

## Features

-   **Mood-Based Discovery**:
    -   Describe your vibe using a free-text input.
    -   Refine with the "Mood Composer": select mood profiles, adjust energy/valence, set tempo, and specify languages.
-   **Advanced Filtering**: Further refine your search with song name and key instruments.
-   **AI-Powered Intent Interpretation**: Uses Genkit with Gemini to translate user input into a rich, descriptive search query for Spotify.
-   **Spotify Integration**: Fetches real song data via Spotify's search API.
-   **In-App Spotify Playback**: Listen to song previews directly within the app using Spotify's embedded player.
-   **In-App YouTube Playback**: Watch related music videos using YouTube's embedded player, fetched via the YouTube Data API.
-   **Responsive Design**: Adapts to various screen sizes for a seamless experience, with a table view for desktop and a list view for mobile.

## Core Workflow

1.  **User Input**:
    *   **Primary Input**: The user describes their desired "Mood / Vibe" using a free-text input field. This is the main driver for discovery.
    *   **Advanced Options (Optional)**: Users can expand an "Advanced Options" section to:
        *   **Mood Composer**: Select a predefined mood profile (e.g., "Chill & Relax", "Energetic Workout"), adjust sliders for Energy (0-100) and Valence (0-100), input a target Tempo (BPM), and select preferred Languages.
        *   **Specific Song Name**: Provide a song name to influence the search.
        *   **Key Instruments**: List key instruments (e.g., guitar, piano).

2.  **AI Interpretation (Gemini via Genkit)**:
    *   All user inputs (free-text mood, Mood Composer selections, song name, key instruments) are gathered.
    *   These inputs are passed to the `interpretMusicalIntent` Genkit flow.
    *   The AI's primary goal is to synthesize these inputs into a **rich, descriptive search query string**. This query is designed to capture the essence of the user's desired vibe and musical preferences.
    *   If a specific song name is provided, the AI uses a tool (`getSpotifyTrackInfoTool`) to fetch the song's actual name and artist from Spotify to make the search query more precise (e.g., "music like 'Song X' by 'Artist Y' matching [mood description]").

3.  **Spotify Interaction**:
    *   The AI-generated search query string is used to call Spotify's `GET /v1/search?type=track` endpoint.
    *   This API call fetches a list of tracks from Spotify that match the descriptive query.

4.  **Displaying Results**:
    *   The fetched tracks are displayed to the user in a responsive layout:
        *   **Desktop**: A table view showing track name, artist, album, cover art, and listen options.
        *   **Mobile**: A list view, optimized for smaller screens, showing similar track information.
    *   Users can listen to song previews directly in the app via embedded Spotify players.
    *   Users can also watch related music videos via embedded YouTube players.
    *   A "Next 5 Songs" button allows users to load more results if available.

## Prerequisites

Before you begin, ensure you have the following installed:

-   [Node.js](https://nodejs.org/) (v18 or later recommended)
-   [npm](https://www.npmjs.com/) (v9 or later) or [yarn](https://yarnpkg.com/)
-   [Google Cloud CLI](https://cloud.google.com/sdk/docs/install) (for Genkit/Gemini integration, specifically for local development authentication if not using an API key)

## Getting Started

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd sonicsurge
```

### 2. Install Dependencies

```bash
npm install
# or
# yarn install
```

### 3. Set Up Environment Variables

SonicSurge requires API keys for Spotify, YouTube, and optionally Google AI (Gemini).

-   Create a `.env` file in the root of your project by copying the example:
    ```bash
    cp .env.example .env
    ```
-   Open the `.env` file and fill in your credentials:
    -   `SPOTIFY_CLIENT_ID`: Your Spotify application Client ID.
    -   `SPOTIFY_CLIENT_SECRET`: Your Spotify application Client Secret.
        -   You can get these from the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/).
    -   `YOUTUBE_API_KEY`: Your YouTube Data API v3 Key.
        -   Obtain this from the [Google Cloud Console](https://console.cloud.google.com/apis/credentials). Ensure the "YouTube Data API v3" is enabled for your project.
    -   `GOOGLE_API_KEY` (Optional): If you are not using Google Cloud Application Default Credentials (ADC) for Genkit/Gemini, you can provide a Google API key. If you use ADC, this can be left blank.

    **Important**: The `.env` file is listed in `.gitignore` and **will not be committed to GitHub**. This is crucial for keeping your API keys secret.

### 4. Google Cloud / Genkit Authentication (for Gemini)

For local development, Genkit typically uses Application Default Credentials (ADC) or a `GOOGLE_API_KEY`.

-   **Using ADC (Recommended for local development if you have a GCP project)**:
    1.  Ensure you have the Google Cloud CLI installed.
    2.  Log in and set up ADC:
        ```bash
        gcloud auth application-default login
        ```
    3.  Make sure your Google Cloud project (set via `gcloud config set project <PROJECT_ID>`) has the "Vertex AI API" or "Generative Language API" enabled and your ADC user has the necessary permissions (e.g., "Vertex AI User").
-   **Using `GOOGLE_API_KEY`**:
    1.  Ensure the key is enabled for the Gemini API (usually via Google AI Studio or Google Cloud Console).
    2.  Place the key in the `GOOGLE_API_KEY` variable in your `.env` file.

### 5. Run the Development Servers

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
    This will start the Genkit development server. The Genkit CLI will show you the relevant ports for the developer UI and flows.

    Alternatively, for auto-reloading of Genkit flows on changes:
    ```bash
    npm run genkit:watch
    ```

### 6. Open the App

Navigate to `http://localhost:9002` (or the port Next.js is running on) in your browser.

## In-App Listening

SonicSurge allows you to listen to song previews and watch related videos directly within the app.

### Spotify
- In the song results, each track will have a "Spotify" button (or a play icon).
- Clicking this button will toggle an embedded Spotify player for that specific track.
- The player allows you to play a ~30-second preview.
- This feature uses Spotify's standard iframe embed and does not require any additional environment variables beyond your `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET`.

### YouTube
- In the song results, each track will also have a "YouTube" button.
- Clicking this button will:
    1. Trigger a search using the YouTube Data API for a video matching the song title and artist.
    2. If a video is found, an embedded YouTube player will appear.
    3. If no video is found or an error occurs, a message like "Video not found" will be displayed.
- This feature requires the `YOUTUBE_API_KEY` to be set in your environment variables.

## Available Scripts

-   `npm run dev`: Starts the Next.js development server.
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

Make sure to configure your environment variables (Spotify Client ID/Secret, YouTube API Key, optionally Google API Key) in the Firebase App Hosting environment settings. For Google Cloud services like Gemini, ensure the App Hosting service account has the necessary IAM permissions (e.g., "Vertex AI User"). For the YouTube Data API, ensure it's enabled in your Google Cloud project associated with the API key and that the key has no restrictions that would prevent its use from App Hosting.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Project Structure Notes

-   `.idx/`: This directory is used by Firebase Studio or related Firebase emulators for storing local development data. It is ignored by Git.
-   `.modified`: This file is a marker used by some development environments or tools to track changes. It is ignored by Git.
-   `src/ai/`: Contains Genkit flows and AI-related logic.
-   `src/actions/`: Holds Next.js Server Actions.
-   `src/components/`: React components, including UI elements from ShadCN.
-   `src/services/`: Service integrations, like the Spotify and YouTube services.
-   `src/app/`: Next.js App Router pages and layouts.
-   `src/hooks/`: Custom React hooks.
-   `src/lib/`: Utility functions, including the structured mood parameter builder.
-   `src/config/`: Configuration files like `moods.json`.
