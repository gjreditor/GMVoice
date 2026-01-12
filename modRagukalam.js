import axios from "axios";
import FormData from "form-data";
import { ElevenLabsClient } from "elevenlabs";

// ================= ENV =================
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const GREEN_API_INSTANCE_ID = process.env.GREEN_API_INSTANCE_ID;
const GREEN_API_TOKEN = process.env.GREEN_API_TOKEN;
const TO_PHONE_NUMBER = process.env.TO_PHONE_NUMBER;

// Chennai default
const LAT = 13.08784;
const LON = 80.27847;

// ================= ELEVENLABS =================
const elevenlabs = new ElevenLabsClient({
  apiKey: ELEVENLABS_API_KEY,
});

// ================= UTILS =================

// Tamil numbers 0–59 (TTS-safe)
const tamilNumbers = [
  "பூஜ்ஜியம்","ஒன்று","இரண்டு","மூன்று","நான்கு",
  "ஐந்து","ஆறு","ஏழு","எட்டு","ஒன்பது",
  "பத்து","பதினொன்று","பன்னிரண்டு","பதிமூன்று","பதினான்கு",
  "பதினைந்து","பதினாறு","பதினேழு","பதினெட்டு","பத்தொன்பது",
  "இருபது","இருபத்தொன்று","இருபத்திரண்டு","இருபத்துமூன்று","இருபத்துநான்கு",
  "இருபத்திஐந்து","இருபத்திஆறு","இருபத்திஏழு","இருபத்திஎட்டு","இருபத்திஒன்பது",
  "முப்பது","முப்பத்தொன்று","முப்பத்திரண்டு","முப்பத்துமூன்று","முப்பத்துநான்கு",
  "முப்பத்திஐந்து","முப்பத்திஆறு","முப்பத்திஏழு","முப்பத்திஎட்டு","முப்பத்திஒன்பது",
  "நாற்பது","நாற்பத்தொன்று","நாற்பத்திரண்டு","நாற்பத்துமூன்று","நாற்பத்துநான்கு",
  "நாற்பத்திஐந்து","நாற்பத்திஆறு","நாற்பத்திஏழு","நாற்பத்திஎட்டு","நாற்பத்திஒன்பது",
  "ஐம்பது","ஐம்பத்தொன்று","ஐம்பத்திரண்டு","ஐம்பத்துமூன்று","ஐம்பத்துநான்கு",
  "ஐம்பத்திஐந்து","ஐம்பத்திஆறு","ஐம்பத்திஏழு","ஐம்பத்திஎட்டு","ஐம்பத்திஒன்பது"
];

// Convert Date → spoken Tamil time
function fmt(t) {
  let h = t.getHours();
  const m = t.getMinutes();

  const period =
    h < 12 ? "காலை" :
    h < 16 ? "மதியம்" :
    h < 19 ? "மாலை" : "இரவு";

  h = h % 12;
  if (h === 0) h = 12;

  let spoken = `${period} ${tamilNumbers[h]} மணி`;

  if (m > 0) {
    spoken += ` ${tamilNumbers[m]} நிமிடம்`;
  }

  return spoken;
}

async function getSunTimes(date) {
  const d = date.toISOString().slice(0, 10);
  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${LAT}&longitude=${LON}&daily=sunrise,sunset&timezone=Asia/Kolkata&start_date=${d}&end_date=${d}`;
  const r = await axios.get(url);
  return {
    sunrise: new Date(r.data.daily.sunrise[0]),
    sunset: new Date(r.data.daily.sunset[0]),
  };
}

// ================= RAHU KALAM =================
const rahuIndex = {
  0: 8, // Sunday
  1: 2,
  2: 7,
  3: 5,
  4: 6,
  5: 4,
  6: 3,
};

async function getRahuKalamTamil() {
  const today = new Date();

  // Traditional Panchang assumption
  const sunrise = new Date(today);
  sunrise.setHours(6, 0, 0, 0); // 06:00 AM fixed

  const part = 90 * 60 * 1000; // 1.5 hours in ms
  const idx = rahuIndex[today.getDay()] - 1;

  const start = new Date(sunrise.getTime() + idx * part);
  const end = new Date(start.getTime() + part);

  return `இன்றைய ராகு காலம் ${fmt(start)} முதல் ${fmt(end)} வரை.`;
}


// ================= TTS =================
async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function generateTTS(text) {
  const audioStream = await elevenlabs.textToSpeech.convert(
    "C2RGMrNBTZaNfddRPeRH", // Tamil-capable voice
    {
      text,
      model_id: "eleven_multilingual_v2",
      output_format: "mp3_44100_128",
      voice_settings: {
        stability: 0.8,
        similarity_boost: 0.3,
        style: 0.2,
      },
    }
  );

  return await streamToBuffer(audioStream);
}

// ================= WHATSAPP =================
async function sendWhatsAppAudio(buffer, caption) {
  const url = `https://api.green-api.com/waInstance${GREEN_API_INSTANCE_ID}/SendFileByUpload/${GREEN_API_TOKEN}`;
  const formData = new FormData();

  formData.append("chatId", `${TO_PHONE_NUMBER}@c.us`);
  formData.append("caption", caption);
  formData.append("file", buffer, {
    filename: "rahu_kalam.mp3",
    contentType: "audio/mpeg",
  });

  await axios.post(url, formData, { headers: formData.getHeaders() });
}

// ================= MAIN =================
(async () => {
  try {
    const days = ["ஞாயிறு","திங்கள்","செவ்வாய்","புதன்","வியாழன்","வெள்ளி","சனி"];
    const today = new Date();
    const dayName = days[today.getDay()];

    const rahuText = await getRahuKalamTamil();

    const fullMessage =
      `இனிய காலை வணக்கம்! 🌞 இன்று ${dayName}. ` +
      rahuText;

    const audio = await generateTTS(fullMessage);
    await sendWhatsAppAudio(audio, fullMessage);

    console.log("✅ Rahu Kalam voice sent successfully");
  } catch (e) {
    console.error("❌ Failed:", e.message || e);
  }
})();
