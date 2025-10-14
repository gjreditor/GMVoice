import axios from "axios";
import FormData from "form-data";
import { ElevenLabsClient } from "elevenlabs";

// --- ENVIRONMENT VARIABLES ---
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const GREEN_API_INSTANCE_ID = process.env.GREEN_API_INSTANCE_ID;
const GREEN_API_TOKEN = process.env.GREEN_API_TOKEN;
const TO_PHONE_NUMBER = process.env.TO_PHONE_NUMBER; // e.g., "919876543210"

// --- CREATE ELEVENLABS CLIENT ---
const elevenlabs = new ElevenLabsClient({
  apiKey: ELEVENLABS_API_KEY,
});

// --- DYNAMIC MESSAGE ---
const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const today = new Date();
const dayName = days[today.getDay()];
const messageText = `Good morning and happy ${dayName}! 🌞`;

async function generateTTS(text) {
  console.log("🎙️ Generating speech...");
  try {
    const audioBuffer = await elevenlabs.textToSpeech.convert(
      "EXAVITQu4vr4xnSDxMaL",
      {
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.5 },
        output_format: "mp3_44100_128",
      }
    );

    console.log("✅ TTS generation successful.");
    return Buffer.from(audioBuffer);
  } catch (error) {
    console.error("❌ Error generating TTS:", error.message || error);
    throw error;
  }
}

async function sendWhatsAppAudio(buffer) {
  console.log("📤 Sending via Green API...");
  try {
    const url = `https://api.green-api.com/waInstance${GREEN_API_INSTANCE_ID}/SendFileByUpload/${GREEN_API_TOKEN}`;
    const formData = new FormData();

    formData.append("chatId", `${TO_PHONE_NUMBER}@c.us`);
    formData.append("caption", messageText);
    formData.append("file", buffer, { filename: "morning.mp3", contentType: "audio/mpeg" });

    const response = await axios.post(url, formData, { headers: formData.getHeaders() });
    if (response.data?.idMessage) {
      console.log("✅ WhatsApp audio sent successfully!");
    } else {
      console.error("❌ WhatsApp send failed:", response.data);
    }
  } catch (error) {
    console.error("❌ Error sending WhatsApp audio:", error.message || error);
  }
}

(async () => {
  try {
    const buffer = await generateTTS(messageText);
    await sendWhatsAppAudio(buffer);
  } catch (err) {
    console.error("❌ Script failed:", err.message || err);
    process.exit(1);
  }
})();
