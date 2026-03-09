const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;

export async function getWeatherForCity(city = "Nairobi") {
  const res = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric`
  );
  const data = await res.json();
  return {
    temp: Math.round(data.main.temp),
    feels: Math.round(data.main.feels_like),
    description: data.weather[0].description,
    icon: data.weather[0].main,
    humidity: data.main.humidity,
    wind: data.wind.speed,
  };
}

export function getWeatherAlert(weather, taskTitle) {
  const desc = weather.description.toLowerCase();
  const isOutdoor = /(run|walk|jog|cycle|hike|outdoor|outside|park|gym)/i.test(taskTitle);
  if (!isOutdoor) return null;

  if (desc.includes("rain") || desc.includes("storm"))
    return `🌧️ Rain expected during "${taskTitle}" — consider rescheduling!`;
  if (weather.temp > 32)
    return `🌡️ Very hot (${weather.temp}°C) during "${taskTitle}" — hydrate well!`;
  if (weather.wind > 10)
    return `💨 Strong winds during "${taskTitle}" — dress accordingly.`;
  if (desc.includes("clear") || desc.includes("sun"))
    return `☀️ Great weather for "${taskTitle}"! ${weather.temp}°C and clear skies.`;
  return null;
}
