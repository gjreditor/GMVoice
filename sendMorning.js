import fs from "fs";
import axios from "axios";
import FormData from "form-data";
import { ElevenLabsClient } from "elevenlabs"; // ✅ Correct import
import * as dotenv from "dotenv";

dotenv.config();

// --- CONFIGURATION ---
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const GREEN_API_INSTANCE_ID = process.env.GREEN_API_INSTANCE_ID;
const GREEN_API_TOKEN = process.env.GREEN_API_TOKEN;
const TO_PHONE_NUMBER = process.env.TO_PHONE_NUMBER; // Include country code (e.g. 91XXXXXXXXXX)

// Initialize ElevenLabs client
const elevenlabs = new ElevenLabsClient({
  apiKey: ELEVENLABS_API_KEY,
});

// Get current day name
const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const today = new Date();
const dayName = days[today.getDay()];

const messageText = `Good Morning ${dayName}`;

// 1️⃣ Generate TTS using ElevenLabs
async function generateTTS(text) {
  try {
    const response = await elevenlabs.textToSpeech.convert(
      "EXAVITQu4vr4xnSDxMaL", // ✅ Default voice ID
      {
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.5 },
        output_format: "mp3_44100_128",
      }
    );

    const fileName = "morning.mp3";
    const fileStream = fs.createWriteStream(fileName);
    response.pipe(fileStream);

    return new Promise((resolve, reject) => {
      fileStream.on("finish", () => {
        console.log("✅ TTS saved as morning.mp3");
        resolve(fileName);
      });
      fileStream.on("error", reject);
    });
  } catch (error) {
    console.error("❌ Error generating TTS:", error.message || error);
    throw error;
  }
}

// 2️⃣ Send the MP3 to WhatsApp using Green API
async function sendWhatsAppAudio(filePath) {
  try {
    const url = `https://api.green-api.com/waInstance${GREEN_API_INSTANCE_ID}/SendFileByUpload/${GREEN_API_TOKEN}`;
    const formData = new FormData();
    formData.append("chatId", `${TO_PHONE_NUMBER}@c.us`);
    formData.append("file", fs.createReadStream(filePath));
    formData.append("filename", "morning.mp3");
    formData.append("caption", messageText);

    await axios.post(url, formData, { headers: formData.getHeaders() });
    console.log("📤 Audio message sent via WhatsApp!");
  } catch (error) {
    console.error("❌ Error sending WhatsApp message:", error.message || error);
    throw error;
  }
}

// 3️⃣ Execute the workflow
(async () => {
  try {
    const filePath = await generateTTS(messageText);
    await sendWhatsAppAudio(filePath);

    // Cleanup
    fs.unlinkSync(filePath);
    console.log("🧹 Temporary file deleted.");
  } catch (error) {
    console.error("❌ Script failed:", error.message || error);
  }
})();
