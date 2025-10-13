import axios from "axios";
import fs from "fs";
import FormData from "form-data";

// --- CONFIGURE HERE USING GITHUB SECRETS ---
const GREEN_API_INSTANCE_ID = process.env.GREEN_API_INSTANCE_ID;
const GREEN_API_TOKEN = process.env.GREEN_API_TOKEN;
const TO_PHONE_NUMBER = process.env.TO_PHONE_NUMBER; // include country code
// ----------------------

// Get current day name
const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const today = new Date();
const dayName = days[today.getDay()];

const messageText = `Good Morning ${dayName}`;

// Get TTS from Puter.js
const puterEndpoint = "https://api.puter.com/v1/ai/tts";

async function getTTS(text) {
  const response = await axios.post(puterEndpoint, {
    text: text,
    voice: "alloy",
    format: "mp3"
  }, { responseType: 'arraybuffer' });

  fs.writeFileSync("morning.mp3", response.data);
  console.log("TTS saved as morning.mp3");
}

// 2️⃣ Send via Green API
async function sendWhatsAppAudio() {
  const url = `https://api.green-api.com/waInstance${GREEN_API_INSTANCE_ID}/SendFileByUpload/${GREEN_API_TOKEN}`;
  const formData = new FormData();
  formData.append("chatId", `${TO_PHONE_NUMBER}@c.us`);
  formData.append("file", fs.createReadStream("morning.mp3"));
  formData.append("filename", "morning.mp3");
  formData.append("caption", messageText);

  await axios.post(url, formData, { headers: formData.getHeaders() });
  console.log("Audio message sent via WhatsApp!");
}

// Run everything
(async () => {
  try {
    await getTTS(messageText);
    await sendWhatsAppAudio();
  } catch (err) {
    console.error("Error:", err.message);
  }
})();
