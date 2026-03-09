# 🚀 Deployment Checklist

## Before You Deploy

### 1. Get API Keys ⏱️ ~10 minutes

- [ ] **OpenWeatherMap API Key**
  - Go to https://openweathermap.org
  - Sign up for free account
  - Navigate to API Keys section
  - Copy your API key
  - Add to `.env` as `VITE_OPENWEATHER_API_KEY`

- [ ] **Firebase Configuration** 
  - Go to https://firebase.google.com
  - Create new project named "Masaa Ni Machache"
  - Enable Authentication → Google Sign-In
  - Register web app
  - Copy all 7 config values to `.env`:
    - `VITE_FIREBASE_API_KEY`
    - `VITE_FIREBASE_AUTH_DOMAIN`
    - `VITE_FIREBASE_PROJECT_ID`
    - `VITE_FIREBASE_STORAGE_BUCKET`
    - `VITE_FIREBASE_MESSAGING_ID`
    - `VITE_FIREBASE_APP_ID`

### 2. Test Locally ⏱️ ~5 minutes

```bash
npm run dev
```

- [ ] App loads without errors
- [ ] Login screen appears
- [ ] Can sign in with Google
- [ ] Weather displays in header
- [ ] Voice button appears
- [ ] Can click voice button (allow microphone)
- [ ] Can say "What do I have today?"
- [ ] Weather alerts appear for outdoor tasks
- [ ] Can sign out

### 3. Build for Production ⏱️ ~1 minute

```bash
npm run build
```

- [ ] Build completes successfully
- [ ] No errors in console

### 4. Deploy to Vercel ⏱️ ~5 minutes

```bash
git add .
git commit -m "add weather, voice assistant, google login"
git push origin main
```

- [ ] Code pushed to GitHub
- [ ] Vercel auto-deploys (if connected)
- [ ] Or manually deploy via Vercel dashboard

### 5. Configure Vercel Environment Variables

In Vercel Dashboard → Your Project → Settings → Environment Variables:

- [ ] Add `VITE_ANTHROPIC_API_KEY`
- [ ] Add `VITE_OPENWEATHER_API_KEY`
- [ ] Add `VITE_FIREBASE_API_KEY`
- [ ] Add `VITE_FIREBASE_AUTH_DOMAIN`
- [ ] Add `VITE_FIREBASE_PROJECT_ID`
- [ ] Add `VITE_FIREBASE_STORAGE_BUCKET`
- [ ] Add `VITE_FIREBASE_MESSAGING_ID`
- [ ] Add `VITE_FIREBASE_APP_ID`
- [ ] Redeploy after adding variables

### 6. Update Firebase Authorized Domains

In Firebase Console → Authentication → Settings → Authorized Domains:

- [ ] Add `localhost` (for local testing)
- [ ] Add your Vercel domain (e.g., `masaa-ni-machache.vercel.app`)
- [ ] Add any custom domains

### 7. Test Production ⏱️ ~5 minutes

Visit your deployed URL:

- [ ] Login works
- [ ] Weather displays
- [ ] Voice assistant works
- [ ] All features functional
- [ ] No console errors

---

## 📋 Quick Command Reference

```bash
# Install dependencies
npm install

# Run locally
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Deploy
git add .
git commit -m "your message"
git push origin main
```

---

## 🎉 You're Done!

Your Masaa Ni Machache app now has:
- ✅ Google Authentication
- ✅ Weather Integration
- ✅ Voice Assistant
- ✅ All FREE services!

---

## 📞 Support Resources

- **Setup Guide**: [SETUP_GUIDE.md](SETUP_GUIDE.md)
- **Quick Reference**: [QUICK_REFERENCE.md](QUICK_REFERENCE.md)
- **New Features**: [NEW_FEATURES.md](NEW_FEATURES.md)
- **Implementation Details**: [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)

---

## 🐛 Troubleshooting

**Build fails?**
- Check all imports are correct
- Verify Firebase is installed: `npm list firebase`

**Login doesn't work?**
- Verify Firebase config in `.env`
- Check authorized domains in Firebase console

**Weather not showing?**
- Verify OpenWeatherMap API key
- Check browser console for errors

**Voice not working?**
- Use Chrome browser
- Allow microphone permissions
- Check HTTPS (required for production)

---

Built with ✨ by Zach
