import express, { Request, Response, Application } from 'express';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import MessagingResponse = require('twilio/lib/twiml/MessagingResponse');
import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';
import * as path from 'path';
const { OpenAI } = require('openai');
// Load environment variables from .env file
dotenv.config();
const app: Application = express();
const port = process.env.PORT || 8000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY; // Your OpenAI API key

const openai = new OpenAI({
    apiKey: OPENAI_API_KEY, // This is the default and can be omitted
  });
// Middlewares
app.use(bodyParser.urlencoded({ extended: false }));

async function handleIncomingAudio(mediaUrl: string) {
    try {
      // Fetch the audio file from Twilio's media URL
      const response = await axios.get(mediaUrl, { responseType: 'stream' });
      const audioStream = response.data;
  
      // Create FormData and append the audio stream
      const formData = new FormData();
      formData.append('file', audioStream, {
        filename: 'audio.wav', // Name of the file, adjust based on actual audio format
        contentType: response.headers['content-type'] // Ensure the correct content type
      });
      formData.append('model', 'whisper-1'); // Specify the Whisper model
  
      // Send the request to OpenAI API for transcription
      const transcriptionResponse = await axios.post(
        'https://api.openai.com/v1/audio/transcriptions',
        formData,
        {
          headers: {
            ...formData.getHeaders(), // Include form data headers
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, // Include the OpenAI API key
          },
        }
      );
  
      // Print the transcribed text
      console.log('Transcription:', transcriptionResponse.data.text);
      return {
        transcriptedText: transcriptionResponse.data.text
      }
    } catch (error) {
      console.error('Error during transcription:', error);
    }
  }



app.post('/incomingMsgWhatsApp', async (req: Request, res: Response) => {
    const reqBody = req.body.Body;
    const messageType = req.body.MessageType;
    const mediaUrl = req.body.MediaUrl0; // For audio file URL
    const twiml = new MessagingResponse();
    
    // Detect the type of message: Audio / Text
    if (messageType === 'text') {
        console.log(`Received text message: "${reqBody}"`);

        // Here, you can perform language detection, translation, or other processing

    } else if (messageType === 'audio' && mediaUrl) {
        try {
            // Download the audio file
            const data = await handleIncomingAudio(mediaUrl);

            twiml.message(data?.transcriptedText);
            res.writeHead(200, { 'Content-Type': 'text/xml' });
            res.end(twiml.toString());

        } catch (error) {
            console.error('Error processing audio message:', error);
        }
    } else {
        console.log('Unsupported message type received.');
        
        
        twiml.message('Currently, we only support text and audio messages.');
        res.writeHead(200, { 'Content-Type': 'text/xml' });
        res.end(twiml.toString());
        return;
    }

    // Send response back to user
    
    twiml.message('Thank you for your message!');

    res.writeHead(200, { 'Content-Type': 'text/xml' });
    res.end(twiml.toString());
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
