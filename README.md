# Masaa Ni Machache

**A smart daily planner powered by AI to help you track goals and maximize productivity.**

Masaa Ni Machache ("Time is Short" in Swahili) is a modern goal-tracking and task management app that combines yearly goal planning with daily task execution. Powered by Claude AI, it provides intelligent planning assistance, progress tracking, and real-time motivation to keep you on track.

## Features

- **Goal Tracking**: Set yearly goals across categories (Health, Learning, Career, Finance) with progress visualization
- **Daily Task Management**: Create and organize tasks linked to your goals with time scheduling and priority levels
- **Real-Time Progress**: View daily completion rates and track momentum toward your objectives
- **AI Planning Assistant**: Chat with Claude AI for intelligent suggestions on task prioritization, goal breakdown, and accountability insights
- **Smart Alerts**: Get notified on achievements, progress milestones, and upcoming tasks
- **Dark Theme UI**: Beautiful, distraction-free interface with customizable color scheme

## Tech Stack

- **Framework**: React 19 + Vite
- **Styling**: Tailwind CSS
- **AI**: Anthropic Claude API
- **State Management**: React Hooks

## Getting Started

### Prerequisites

- Node.js 16+ and npm
- Anthropic API key (get one at [console.anthropic.com](https://console.anthropic.com))

### Installation

```bash
# Clone the repository
git clone https://github.com/zak-dev-art/Masaa-Ni-Machache.git
cd masaa-ni-machache

# Install dependencies
npm install

# Create .env file and add your API key
echo "VITE_ANTHROPIC_API_KEY=your_api_key_here" > .env
```

### Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production

```bash
npm run build
```

## Usage

1. **Add Goals**: Create yearly goals with target completion dates
2. **Plan Tasks**: Add daily tasks linked to your goals
3. **Track Progress**: Check off completed tasks and watch your daily completion percentage grow
4. **Chat with AI**: Ask your planning assistant for advice on structuring your day or breaking down larger goals
5. **Monitor Alerts**: Stay motivated with real-time achievement notifications

## Project Structure

```
src/
├── App.jsx       # Main application component
├── main.jsx      # React entry point
└── index.css     # Global styles
```

## Environment Variables

Create a `.env` file in the root directory:

```
VITE_ANTHROPIC_API_KEY=your_anthropic_api_key
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

## License

This project is open source and available under the MIT License.

## Contributing

Contributions are welcome! Feel free to fork the repository and submit pull requests.

---

Built with ✨ by Zach
