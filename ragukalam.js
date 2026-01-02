import axios from "axios";
import FormData from "form-data";
import { ElevenLabsClient } from "elevenlabs";

// ================= ENV =================
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const GREEN_API_INSTANCE_ID = process.env.GREEN_API_INSTANCE_ID;
const GREEN_API_TOKEN = process.env.GREEN_API_TOKEN;
const TO_PHONE_NUMBER = process.env.TO_PHONE_NUMBER;

// Chennai default (change if needed)
const LAT = 13.08784;
const LON = 80.27847;

// ================= ELEVENLABS =================
const elevenlabs = new ElevenLabsClient({
  apiKey: ELEVENLABS_API_KEY,
});

// ================= UTILS =================
function fmt(t) {
  return t.toTimeString().slice(0, 5);
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
  const { sunrise, sunset } = await getSunTimes(today);

  const part = (sunset - sunrise) / 8;
  const idx = rahuIndex[sunrise.getDay()] - 1;

  const start = new Date(sunrise.getTime() + idx * part);
  const end = new Date(start.getTime() + part);

  return `இன்றைய ராகு காலம் காலை ${fmt(start)} முதல் ${fmt(end)} வரை.`;
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
