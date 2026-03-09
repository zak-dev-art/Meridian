# Setup Guide for New Features

## 🔥 Firebase Setup (Google Login)

### 1. Create Firebase Project
1. Go to [firebase.google.com](https://firebase.google.com)
2. Click "Add Project" → name it **Masaa Ni Machache** → continue through setup

### 2. Enable Google Sign-In
1. In Firebase console → **Authentication** → **Sign-in method**
2. Enable **Google** → save

### 3. Register Your Web App
1. Click the **</>** web icon on the project homepage
2. Name it **masaa-ni-machache-web** → click **Register app**
3. Copy the config object shown

### 4. Update .env File
Replace the placeholder values in `.env` with your Firebase config:
```
VITE_FIREBASE_API_KEY=your-actual-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-app.appspot.com
VITE_FIREBASE_MESSAGING_ID=your-messaging-id
VITE_FIREBASE_APP_ID=your-app-id
```

---

## 🌤️ OpenWeatherMap Setup

### 1. Get API Key
1. Go to [openweathermap.org](https://openweathermap.org)
2. Sign up → **API Keys** → copy your key

### 2. Update .env File
```
VITE_OPENWEATHER_API_KEY=your-actual-openweather-api-key
```

### 3. Change City (Optional)
Edit `src/weather.js` line 3 to change default city from "Nairobi" to your location.

---

## 🎙️ Voice Assistant

No setup needed! Uses built-in Web Speech API (works best in Chrome).

### Voice Commands:
- "What do I have today?" - Get daily briefing
- "Add task [task name]" - Add a new task
- Click the microphone button in the header to start

---

## 🚀 Deploy to Vercel

### 1. Build & Push
```bash
npm run build
git add .
git commit -m "add weather, voice assistant, google login"
git push origin main
```

### 2. Add Environment Variables in Vercel
1. Go to Vercel dashboard → your project → **Settings** → **Environment Variables**
2. Add all the variables from your `.env` file

### 3. Update Firebase Authorized Domains
1. Firebase console → **Authentication** → **Settings** → **Authorized domains**
2. Add your Vercel domain (e.g., `masaa-ni-machache.vercel.app`)

---

## ✅ Test Locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and test:
- ✓ Google Sign-In
- ✓ Weather display in header
- ✓ Voice assistant button
- ✓ Weather alerts for outdoor tasks

---

## 📝 Features Added

### 1. Google Authentication
- Secure login with Google account
- User profile display in header
- Sign out functionality

### 2. Weather Integration
- Real-time weather display
- Smart alerts for outdoor tasks
- Temperature, conditions, and wind speed

### 3. Voice Assistant
- Morning briefing with tasks and weather
- Voice commands for task management
- Text-to-speech responses

---

## 🆘 Troubleshooting

**Voice not working?**
- Use Chrome browser (best support)
- Allow microphone permissions

**Weather not loading?**
- Check API key is correct
- Verify city name spelling

**Firebase errors?**
- Verify all config values are correct
- Check authorized domains include localhost:5173

---

Built with ✨ by Zach
