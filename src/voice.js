export function speak(text) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.95;
  utterance.pitch = 1.05;
  utterance.volume = 1;
  const voices = speechSynthesis.getVoices();
  const preferred = voices.find(v => v.name.includes("Google") || v.name.includes("Samantha"));
  if (preferred) utterance.voice = preferred;
  speechSynthesis.speak(utterance);
}

export function startListening(onResult, onEnd) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert("Your browser doesn't support voice recognition. Try Chrome.");
    return;
  }
  const recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.onresult = (e) => onResult(e.results[0][0].transcript);
  recognition.onend = onEnd;
  recognition.start();
  return recognition;
}

export function buildMorningBriefing(user, tasks, goals, weather) {
  const pending = tasks.filter(t => !t.done);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const name = user?.displayName?.split(" ")[0] || "there";

  return `${greeting} ${name}! 
    You have ${pending.length} tasks today. 
    ${pending.slice(0, 3).map(t => `${t.time ? `At ${t.time},` : ""} ${t.title}`).join(". ")}. 
    ${weather ? `Current weather is ${weather.description}, ${weather.temp} degrees celsius.` : ""}
    Your top goal progress: ${goals[0]?.title} is at ${goals[0]?.progress} percent. 
    Let's make today count!`;
}
