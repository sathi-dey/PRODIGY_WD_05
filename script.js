const API_KEY = 'fd1e386a1f8533a8a184764dd9dcb0b2';
let currentUnit = 'metric';
let lastCity = '';
let lastCoords = null;
let map;

const weatherInfo = document.getElementById('weather-info');
const forecastInfo = document.getElementById('forecast-info');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const celsiusBtn = document.getElementById('celsius-btn');
const fahrenheitBtn = document.getElementById('fahrenheit-btn');

document.addEventListener('DOMContentLoaded', () => {
    searchBtn.addEventListener('click', handleSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });

    celsiusBtn.addEventListener('click', () => toggleUnit('metric'));
    fahrenheitBtn.addEventListener('click', () => toggleUnit('imperial'));

    document.getElementById('location-btn').addEventListener('click', () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude);
                },
                (error) => {
                    weatherInfo.innerHTML = `<p class="error">Error: ${error.message}</p>`;
                }
            );
        } else {
            weatherInfo.innerHTML = '<p class="error">Geolocation not supported</p>';
        }
    });
});

function handleSearch() {
    const city = searchInput.value.trim();
    if (city) fetchWeatherByCity(city);
}

async function fetchWeatherByCity(city) {
    try {
        showLoading();
        const response = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=${currentUnit}`
        );
        if (!response.ok) throw new Error(`HTTP error ${response.status}`);
        const data = await response.json();
        lastCity = city;
        lastCoords = null;
        displayWeather(data);
        fetchForecast(city);
        initMap(data.coord.lat, data.coord.lon, data.name);
        setDynamicBackground(data.weather[0].main);
        updateWeatherAnimation(data.weather[0].main); // ✅ NEW
        showWeatherTip(data.weather[0].main);
    } catch (err) {
        showError(err.message);
    }
}

async function fetchWeatherByCoords(lat, lon) {
    try {
        showLoading();
        const response = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${currentUnit}`
        );
        if (!response.ok) throw new Error(`HTTP error ${response.status}`);
        const data = await response.json();
        lastCity = '';
        lastCoords = { lat, lon };
        displayWeather(data);
        fetchForecastByCoords(lat, lon);
        initMap(lat, lon, data.name);
        setDynamicBackground(data.weather[0].main);
        updateWeatherAnimation(data.weather[0].main); // ✅ NEW
        showWeatherTip(data.weather[0].main);
    } catch (err) {
        showError(err.message);
    }
}

function displayWeather(data) {
    weatherInfo.style.display = 'block';
    document.querySelector('.right-panel').style.display = 'flex';
    const { name, sys, main, weather, wind, clouds, visibility } = data;
    const iconUrl = `https://openweathermap.org/img/wn/${weather[0].icon}@2x.png`;
    weatherInfo.innerHTML = `
        <h2>${name}, ${sys.country}</h2>
        <div style="display:flex;align-items:center;gap:10px;margin:10px 0;">
            <img src="${iconUrl}" alt="${weather[0].description}" style="width:60px;height:60px;">
            <span style="font-size:2rem;font-weight:bold;">${Math.round(main.temp)}°${currentUnit === 'metric' ? 'C' : 'F'}</span>
        </div>
        <p>${weather[0].main} (${weather[0].description})</p>
        <p>Feels like: ${Math.round(main.feels_like)}°</p>
        <p>Humidity: ${main.humidity}%</p>
        <p>Pressure: ${main.pressure} hPa</p>
        <p>Wind: ${wind.speed} ${currentUnit === 'metric' ? 'm/s' : 'mph'} ${wind.deg ? `from ${degToCompass(wind.deg)}` : ''}</p>
        <p>Cloudiness: ${clouds.all}%</p>
        ${visibility ? `<p>Visibility: ${(visibility / 1000).toFixed(1)} km</p>` : ''}
    `;
}

async function fetchForecast(city) {
    try {
        const response = await fetch(
            `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${API_KEY}&units=${currentUnit}`
        );
        const data = await response.json();
        displayForecast(data);
    } catch {
        forecastInfo.innerHTML = '<p class="error">Could not load forecast</p>';
    }
}

async function fetchForecastByCoords(lat, lon) {
    try {
        const response = await fetch(
            `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${currentUnit}`
        );
        const data = await response.json();
        displayForecast(data);
    } catch {
        forecastInfo.innerHTML = '<p class="error">Could not load forecast</p>';
    }
}

function displayForecast(data) {
    forecastInfo.innerHTML = '';
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const daily = {};
    data.list.forEach(item => {
        const date = new Date(item.dt * 1000);
        const key = date.toDateString();
        if (!daily[key]) {
            daily[key] = { day: days[date.getDay()], temps: [], weather: item.weather[0] };
        }
        daily[key].temps.push(item.main.temp);
    });
    Object.values(daily).slice(0, 5).forEach(d => {
        const max = Math.max(...d.temps);
        const min = Math.min(...d.temps);
        const icon = `https://openweathermap.org/img/wn/${d.weather.icon}.png`;
        forecastInfo.innerHTML += `
            <div class="forecast-item">
                <div class="forecast-day">${d.day}</div>
                <img src="${icon}" alt="${d.weather.description}" />
                <div class="forecast-temp"><span class="temp-high">${Math.round(max)}°</span> / <span class="temp-low">${Math.round(min)}°</span></div>
            </div>
        `;
    });
}

function initMap(lat, lon, name) {
    if (map) {
        map.setView([lat, lon], 10);
        return;
    }
    map = L.map('map').setView([lat, lon], 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
    L.marker([lat, lon]).addTo(map).bindPopup(`<b>${name}</b>`).openPopup();
}

function toggleUnit(unit) {
    if (unit === currentUnit) return;
    currentUnit = unit;
    celsiusBtn.classList.toggle('active', unit === 'metric');
    fahrenheitBtn.classList.toggle('active', unit === 'imperial');
    if (lastCity) fetchWeatherByCity(lastCity);
    else if (lastCoords) fetchWeatherByCoords(lastCoords.lat, lastCoords.lon);
}

function degToCompass(num) {
    const val = Math.floor((num / 22.5) + 0.5);
    const arr = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
    return arr[val % 16];
}

function setDynamicBackground(condition) {
    const colors = {
        clear: 'linear-gradient(135deg, #56CCF2 0%, #2F80ED 100%)',
        clouds: 'linear-gradient(135deg, #BBD2C5 0%, #536976 100%)',
        rain: 'linear-gradient(135deg, #4B79A1 0%, #283E51 100%)',
        drizzle: 'linear-gradient(135deg, #4B79A1 0%, #283E51 100%)',
        thunderstorm: 'linear-gradient(135deg, #0F2027 0%, #203A43 50%, #2C5364 100%)',
        snow: 'linear-gradient(135deg, #E0EAFC 0%, #CFDEF3 100%)',
        mist: 'linear-gradient(135deg, #BDC3C7 0%, #2C3E50 100%)',
        smoke: 'linear-gradient(135deg, #BDC3C7 0%, #2C3E50 100%)',
        haze: 'linear-gradient(135deg, #BDC3C7 0%, #2C3E50 100%)',
        dust: 'linear-gradient(135deg, #BDC3C7 0%, #2C3E50 100%)',
        fog: 'linear-gradient(135deg, #BDC3C7 0%, #2C3E50 100%)'
    };
    document.body.style.background = colors[condition.toLowerCase()] || 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)';
}

function updateWeatherAnimation(condition) {
    const anim = document.getElementById('weather-animation');
    anim.className = ''; // reset
    condition = condition.toLowerCase();
    if (condition.includes("clear")) anim.classList.add("sunny");
    else if (condition.includes("cloud")) anim.classList.add("cloudy");
    else if (condition.includes("rain")) anim.classList.add("rainy");
    else if (condition.includes("snow")) anim.classList.add("snowy");
    else if (condition.includes("haze") || condition.includes("mist") || condition.includes("fog")) 
        anim.classList.add("hazy");
}

function showWeatherTip(condition) {
    const tips = {
        clear: "It's sunny! Don't forget your sunscreen.",
        clouds: "Partly cloudy today. A light jacket might be good.",
        rain: "Rain expected. Don't forget your umbrella!",
        thunderstorm: "Thunderstorms ahead. Stay indoors if possible.",
        snow: "Snow today. Dress warmly and drive carefully."
    };
    weatherInfo.innerHTML += `<div class="weather-tip">${tips[condition.toLowerCase()] || "Check the weather details above."}</div>`;
}

function showLoading() {
    weatherInfo.style.display = 'block';
    document.querySelector('.right-panel').style.display = 'flex';
    weatherInfo.innerHTML = '<p>Loading...</p>';
    forecastInfo.innerHTML = '';
}

function showError(msg) {
    weatherInfo.innerHTML = `<p class="error">Error: ${msg}</p>`;
    document.querySelector('.right-panel').style.display = 'none';
}
