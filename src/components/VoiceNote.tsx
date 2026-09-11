import { useEffect, useRef, useState } from 'react'
import type { Language } from '../i18n'

export function VoiceNote({ language, onApply, offline }: { language: Language; onApply: (text: string) => void; offline: boolean }) {
  const hi = language === 'hi'
  const [recording, setRecording] = useState(false), [busy, setBusy] = useState(false), [clip, setClip] = useState<Blob | null>(null), [url, setUrl] = useState(''), [text, setText] = useState(''), [error, setError] = useState('')
  const recorder = useRef<MediaRecorder | null>(null), stream = useRef<MediaStream | null>(null), timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => { clearTimeout(timer.current); stream.current?.getTracks().forEach(t => t.stop()); if (recorder.current) recorder.current.onstop = null; window.speechSynthesis?.cancel() }, [])
  useEffect(() => { if (!clip) return; const next = URL.createObjectURL(clip); setUrl(next); return () => URL.revokeObjectURL(next) }, [clip])
  const stop = () => { clearTimeout(timer.current); if (recorder.current?.state === 'recording') recorder.current.stop(); stream.current?.getTracks().forEach(t => t.stop()); setRecording(false) }
  const start = async () => {
    setError(''); setText('')
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) throw new Error(hi ? 'इस ब्राउज़र में रिकॉर्डिंग उपलब्ध नहीं है। ऑडियो अपलोड करें।' : 'Recording is unavailable in this browser. Upload audio instead.')
      const media = await navigator.mediaDevices.getUserMedia({ audio: true }); stream.current = media
      const mimeType = ['audio/webm','audio/mp4','audio/ogg'].find(t => MediaRecorder.isTypeSupported(t))
      const rec = new MediaRecorder(media, mimeType ? { mimeType } : undefined); recorder.current = rec
      const chunks: Blob[] = []; rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data) }; rec.onstop = () => setClip(new Blob(chunks, { type: rec.mimeType }))
      rec.start(); setRecording(true); timer.current = setTimeout(stop, 120000)
    } catch (e) { setError(e instanceof Error ? e.message : 'Microphone unavailable') }
  }
  const transcribe = async () => {
    if (!clip) return; setBusy(true); setError('')
    try {
      if (clip.size > 8 * 1024 * 1024) throw new Error('Audio must be under 8 MB.')
      const audio = await new Promise<string>((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result).split(',')[1]); r.onerror = reject; r.readAsDataURL(clip) })
      const response = await fetch('/api/voice/transcribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ audio, mimeType: clip.type.split(';')[0], language }), signal: AbortSignal.timeout(110000) })
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Transcription failed'); setText(data.text)
    } catch (e) { setError(e instanceof Error ? e.message : 'Transcription failed. Please retry.') } finally { setBusy(false) }
  }
  return <section className="voice-note"><span className="eyebrow">GEMINI · {hi ? 'वॉइस नोट' : 'VOICE NOTE'}</span><h3>{hi ? 'बोलकर रिपोर्ट लिखें' : 'Speak your field report'}</h3><p>{hi ? 'पहले सुनें, फिर Gemini को भेजें। भेजने से पहले लिखित रिपोर्ट जाँचें।' : 'Record up to 2 minutes, preview, then send to Google Gemini for transcription. Review before adding to your report.'}</p><div className="voice-actions"><button type="button" className="button primary" disabled={busy} onClick={recording ? stop : start}>{recording ? (hi ? '■ रोकें' : '■ Stop recording') : (hi ? '● रिकॉर्ड करें' : '● Record note')}</button><label>{hi ? 'या ऑडियो अपलोड करें' : 'Or upload audio'}<input type="file" accept="audio/webm,audio/mp4,audio/wav,audio/mpeg,audio/ogg" disabled={busy || recording} onChange={e => { const file = e.target.files?.[0]; if (file) { setClip(file); setText(''); setError('') } }} /></label></div>{recording && <p role="status">{hi ? 'रिकॉर्डिंग चालू है…' : 'Recording… stops automatically after 2 minutes.'}</p>}{clip && !recording && <><audio controls src={url} /><button type="button" className="button ghost" disabled={busy || offline} onClick={transcribe}>{busy ? (hi ? 'लिखा जा रहा है…' : 'Transcribing…') : (hi ? 'Gemini से लिखवाएँ' : 'Transcribe with Gemini')}</button></>}{offline && <p>{hi ? 'लिखने के लिए इंटरनेट चाहिए।' : 'Transcription requires an internet connection.'}</p>}{error && <p role="alert">{error}</p>}{text && <label>{hi ? 'लिखित नोट की समीक्षा करें' : 'Review transcript'}<textarea value={text} onChange={e => setText(e.target.value)} /><button type="button" className="button primary" onClick={() => onApply(text)}>{hi ? 'विवरण में जोड़ें' : 'Add to description'}</button></label>}</section>
}
