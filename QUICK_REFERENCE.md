# Quick Reference - New Features

## 🔑 API Keys Needed

| Service | Where to Get | Cost |
|---------|-------------|------|
| OpenWeatherMap | [openweathermap.org](https://openweathermap.org) | FREE |
| Firebase | [firebase.google.com](https://firebase.google.com) | FREE |
| Voice Assistant | Built into browser | FREE |

## 🎙️ Voice Commands

| Say This | What Happens |
|----------|--------------|
| "What do I have today?" | Get daily briefing with tasks, goals, and weather |
| "Tasks today" | Same as above |
| "Add task [name]" | Creates a new task with the name you specify |

## 🌤️ Weather Alerts

Automatically triggered for outdoor tasks containing:
- run, walk, jog, cycle, hike
- outdoor, outside, park, gym

Alert types:
- 🌧️ Rain/storm warning
- 🌡️ High temperature alert (>32°C)
- 💨 Strong wind warning (>10 m/s)
- ☀️ Perfect weather notification

## 🔐 Authentication Flow

1. User visits app → sees login screen
2. Clicks "Sign in with Google"
3. Authenticates with Google account
4. Redirected to dashboard
5. Profile shows in header with sign-out option

## 📁 File Structure

```
src/
├── App.jsx          # Main app (updated with new features)
├── firebase.js      # Google authentication
├── weather.js       # Weather API & alerts
├── voice.js         # Voice commands & TTS
├── main.jsx
└── index.css
```

## ⚙️ Configuration Files

- `.env` - Your actual API keys (DO NOT commit to git)
- `.env.example` - Template for required variables
- `SETUP_GUIDE.md` - Detailed setup instructions
- `IMPLEMENTATION_SUMMARY.md` - What was changed

## 🧪 Testing Checklist

- [ ] Google Sign-In works
- [ ] Weather displays in header
- [ ] Voice button appears and responds
- [ ] Weather alerts show for outdoor tasks
- [ ] User profile displays correctly
- [ ] Sign out works
- [ ] Voice commands recognized
- [ ] Morning briefing speaks correctly

## 🚨 Common Issues

**"Firebase not configured"**
→ Add your Firebase config to `.env`

**"Weather not loading"**
→ Add OpenWeatherMap API key to `.env`

**"Voice not working"**
→ Use Chrome browser and allow microphone access

**"Unauthorized domain"**
→ Add your domain to Firebase authorized domains

## 📞 Support

Check `SETUP_GUIDE.md` for detailed instructions on:
- Setting up Firebase project
- Getting OpenWeatherMap API key
- Deploying to Vercel
- Troubleshooting

---

🎉 All services are FREE tier!
