import fs from 'fs';
import { ElevenLabs } from '@elevenlabs/elevenlabs-js';
import axios from 'axios';
import FormData from 'form-data';

// --- CONFIGURATION ---
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const GREEN_API_INSTANCE_ID = process.env.GREEN_API_INSTANCE_ID;
const GREEN_API_TOKEN = process.env.GREEN_API_TOKEN;
const TO_PHONE_NUMBER = process.env.TO_PHONE_NUMBER; // Include country code

// Initialize ElevenLabs client
const elevenlabs = new ElevenLabs(ELEVENLABS_API_KEY);

// Get current day name
const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const today = new Date();
const dayName = days[today.getDay()];

const messageText = `Good Morning ${dayName}`;

async function generateTTS(text) {
  try {
    const audioBuffer = await elevenlabs.textToSpeech({
      textInput: text,
      voiceId: 'EXAVITQu4vr4xnSDxMaL', // Default voice ID
      modelId: 'eleven_multilingual_v2',
      voiceSettings: { stability: 0.5, similarityBoost: 0.5 }
    });

    fs.writeFileSync('morning.mp3', audioBuffer.audio);
    console.log('TTS saved as morning.mp3');
  } catch (error) {
    console.error('Error generating TTS:', error);
  }
}

async function sendWhatsAppAudio() {
  try {
    const url = `https://api.green-api.com/waInstance${GREEN_API_INSTANCE_ID}/SendFileByUpload/${GREEN_API_TOKEN}`;
    const formData = new FormData();
    formData.append('chatId', `${TO_PHONE_NUMBER}@c.us`);
    formData.append('file', fs.createReadStream('morning.mp3'));
    formData.append('filename', 'morning.mp3');
    formData.append('caption', messageText);

    await axios.post(url, formData, { headers: formData.getHeaders() });
    console.log('Audio message sent via WhatsApp!');
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
  }
}

// Execute functions
(async () => {
  await generateTTS(messageText);
  await sendWhatsAppAudio();
})();

