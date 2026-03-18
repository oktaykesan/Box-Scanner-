import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

async function listModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("No API key found.");
        process.exit(1);
    }
    const genAI = new GoogleGenerativeAI(apiKey);

    // As of latest SDK, we might not have listModels exposed directly, but let's try calling REST API manually
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (!response.ok) {
        console.error("Failed to fetch models", await response.text());
        return;
    }
    const data = await response.json();
    console.log("Available models:");
    data.models.forEach((m: any) => console.log(m.name));
}

listModels();
