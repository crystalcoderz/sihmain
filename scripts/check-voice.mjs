import fs from 'node:fs'
import { vertexRequest } from '../server/voice-api.mjs'
const audio = fs.readFileSync(process.argv[2]).toString('base64')
try { console.log(await vertexRequest([{ text: 'Transcribe this audio exactly. Return only the transcript.' }, { inlineData: { mimeType: 'audio/wav', data: audio } }])) } catch (error) { console.error(error.message); process.exitCode = 1 }
