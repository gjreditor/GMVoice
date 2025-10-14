import axios from "axios";
import FormData from "form-data";
import { ElevenLabsClient } from "elevenlabs";

// --- ENVIRONMENT VARIABLES ---
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const GREEN_API_INSTANCE_ID = process.env.GREEN_API_INSTANCE_ID;
const GREEN_API_TOKEN = process.env.GREEN_API_TOKEN;
const TO_PHONE_NUMBER = process.env.TO_PHONE_NUMBER; // e.g., "919876543210"

// --- INITIALIZE ELEVENLABS CLIENT ---
const elevenlabs = new ElevenLabsClient({
  apiKey: ELEVENLABS_API_KEY,
});

// --- GREETING MESSAGE (Tamil) ---
const days = ["ஞாயிறு", "திங்கள்", "செவ்வாய்", "புதன்", "வியாழன்", "வெள்ளி", "சனி"];
const today = new Date();
const dayName = days[today.getDay()];
const messageText = `இனிய காலை வணக்கம்! இன்று ${dayName}! 🌞`;

// --- Convert ReadableStream → Buffer ---
async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function generateTTS(text) {
  console.log("🎙️ Generating Tamil speech...");
  try {
    const audioStream = await elevenlabs.textToSpeech.convert(
      // ✅ Use your Tamil-capable voice ID (replace below if you have one)
      "C2RGMrNBTZaNfddRPeRH",
      {
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.8,           // More stable = slower, calmer
          similarity_boost: 0.3,    // Lower = less fast, less expressive
          style: 0.2,               // Subtle tone
        },
        output_format: "mp3_44100_128",
      }
    );

    const audioBuffer = await streamToBuffer(audioStream);

    console.log("✅ Tamil TTS generation successful.");
    return audioBuffer;
  } catch (error) {
    console.error("❌ Error generating Tamil TTS:", error.message || error);
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
      console.log("✅ WhatsApp Tamil audio sent successfully!");
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
