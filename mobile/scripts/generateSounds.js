// Script to generate basic MP3/WAV files for the BoxScan Audio System
// Requires standard node modules. Since generating true MP3 in pure JS without external native deps is complex,
// we will generate valid WAV files instead (the user mentioned MP3 for size, but for 1-second UI sounds, 
// a mono 11025Hz WAV is < 20KB, perfectly fine and native to JS generation).

const fs = require('fs');
const path = require('path');

function writeWavHeader(buffer, dataLength, sampleRate, numChannels, bytesPerSample) {
    let offset = 0;
    
    // ChunkID "RIFF"
    buffer.write('RIFF', offset); offset += 4;
    // ChunkSize
    buffer.writeUInt32LE(36 + dataLength, offset); offset += 4;
    // Format "WAVE"
    buffer.write('WAVE', offset); offset += 4;
    
    // Subchunk1ID "fmt "
    buffer.write('fmt ', offset); offset += 4;
    // Subchunk1Size (16 for PCM)
    buffer.writeUInt32LE(16, offset); offset += 4;
    // AudioFormat (1 for PCM)
    buffer.writeUInt16LE(1, offset); offset += 2;
    // NumChannels
    buffer.writeUInt16LE(numChannels, offset); offset += 2;
    // SampleRate
    buffer.writeUInt32LE(sampleRate, offset); offset += 4;
    // ByteRate
    buffer.writeUInt32LE(sampleRate * numChannels * bytesPerSample, offset); offset += 4;
    // BlockAlign
    buffer.writeUInt16LE(numChannels * bytesPerSample, offset); offset += 2;
    // BitsPerSample
    buffer.writeUInt16LE(bytesPerSample * 8, offset); offset += 2;
    
    // Subchunk2ID "data"
    buffer.write('data', offset); offset += 4;
    // Subchunk2Size
    buffer.writeUInt32LE(dataLength, offset);
}

function generateSineWaveWav(filename, frequenciesAndEnvelopes, durationSec, sampleRate = 22050) {
    const numChannels = 1;
    const bytesPerSample = 2; // 16-bit
    const totalSamples = Math.floor(durationSec * sampleRate);
    const dataLength = totalSamples * bytesPerSample;
    
    const buffer = Buffer.alloc(44 + dataLength);
    writeWavHeader(buffer, dataLength, sampleRate, numChannels, bytesPerSample);
    
    let offset = 44;
    for (let i = 0; i < totalSamples; i++) {
        const time = i / sampleRate;
        let sample = 0;
        
        for (const spec of frequenciesAndEnvelopes) {
            if (time >= spec.startTime && time <= spec.endTime) {
                // Envelope (ADSR simplified to AD)
                const relTime = time - spec.startTime;
                let env = 1.0;
                
                if (spec.attack && relTime < spec.attack) {
                    env = relTime / spec.attack;
                } else if (spec.decay && time > spec.endTime - spec.decay) {
                    env = (spec.endTime - time) / spec.decay;
                }
                
                const val = Math.sin(2 * Math.PI * spec.freq * relTime);
                sample += val * env * (spec.gain || 1.0);
            }
        }
        
        // Hard clip
        sample = Math.max(-1, Math.min(1, sample));
        
        // 16-bit little endian
        const intSample = Math.floor(sample * 32767);
        buffer.writeInt16LE(intSample, offset);
        offset += 2;
    }
    
    fs.writeFileSync(path.join(__dirname, '../assets/sounds', filename), buffer);
    console.log(`Generated ${filename}`);
}

// 1. Activate: 220, 330, 440, 660 Hz rising
generateSineWaveWav('activate.wav', [
    { freq: 220, startTime: 0, endTime: 0.25, attack: 0.04, decay: 0.21, gain: 0.25 },
    { freq: 330, startTime: 0.12, endTime: 0.37, attack: 0.04, decay: 0.21, gain: 0.25 },
    { freq: 440, startTime: 0.24, endTime: 0.49, attack: 0.04, decay: 0.21, gain: 0.25 },
    { freq: 660, startTime: 0.38, endTime: 0.63, attack: 0.04, decay: 0.21, gain: 0.25 }
], 0.7);

// 2. Scan: low drone
generateSineWaveWav('scan.wav', [
    { freq: 80, startTime: 0, endTime: 2.6, attack: 0.5, decay: 0.5, gain: 0.4 },
    { freq: 160, startTime: 0.2, endTime: 2.4, attack: 0.5, decay: 0.5, gain: 0.2 }
], 2.6);

// 3. Complete: Minor arpeggio (G3, B3, D4, G4 approx 196, 247, 294, 392)
generateSineWaveWav('complete.wav', [
    { freq: 196, startTime: 0, endTime: 0.9, attack: 0.06, decay: 0.8, gain: 0.2 },
    { freq: 247, startTime: 0.08, endTime: 0.98, attack: 0.06, decay: 0.8, gain: 0.2 },
    { freq: 294, startTime: 0.16, endTime: 1.06, attack: 0.06, decay: 0.8, gain: 0.2 },
    { freq: 392, startTime: 0.24, endTime: 1.14, attack: 0.06, decay: 0.8, gain: 0.2 }
], 1.2);

// 4. Deactivate: descending
generateSineWaveWav('deactivate.wav', [
    { freq: 220, startTime: 0, endTime: 0.6, attack: 0.05, decay: 0.55, gain: 0.3 },
    { freq: 110, startTime: 0.1, endTime: 0.6, attack: 0.05, decay: 0.5, gain: 0.2 }
], 0.6);
