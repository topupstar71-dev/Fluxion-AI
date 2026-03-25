# Fluxion AI Premium - Installation & Deployment Guide

## Prerequisites
- Node.js 18+
- Firebase Project
- Google AI Studio (Gemini) API Key

## Setup Instructions

1. **Firebase Setup**:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project
   - Enable **Authentication** (Google & Email/Password)
   - Enable **Cloud Firestore**
   - Create a Web App and copy the configuration

2. **Environment Variables**:
   - Create a `.env` file based on `.env.example`
   - Fill in your Firebase credentials
   - `GEMINI_API_KEY` is automatically handled if running in AI Studio

3. **Install Dependencies**:
   ```bash
   npm install
   ```

4. **Run Development Server**:
   ```bash
   npm run dev
   ```

## Deployment

1. **Build the App**:
   ```bash
   npm run build
   ```

2. **Start Production Server**:
   ```bash
   npm start
   ```

## Features
- **Premium AI Chat**: Powered by Gemini 3.1 Pro
- **Image Generation**: Powered by Nano Banana (Gemini 3.1 Flash Image)
- **Voice Support**: Speech-to-Text and Text-to-Speech
- **Authentication**: Secure Firebase Auth
- **Usage Tracking**: Monitor chat and image counts per user
- **Modern UI**: Dark/Light mode with responsive design
