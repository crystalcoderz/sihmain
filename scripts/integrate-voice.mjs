import fs from 'node:fs'
const path = 'src/App.tsx'
let source = fs.readFileSync(path, 'utf8')
source = source.replace("import { offlineQueue }", "import { VoiceNote } from './components/VoiceNote'\nimport { LanguageWelcome } from './components/LanguageWelcome'\nimport { offlineQueue }")
source = source.replace('function FieldReports({ simulatedOffline,', 'function FieldReports({ language, simulatedOffline,').replace('pending: number }) {', 'pending: number; language: Language }) {')
source = source.replace('<form onSubmit={submit}>', '<VoiceNote language={language} offline={simulatedOffline} onApply={(text) => setDescription(current => current ? `${current}\\n${text}` : text)} /><form onSubmit={submit}>')
source = source.replace("const [language, setLanguage] = useState<Language>('en')", "const [language, updateLanguage] = useState<Language>(() => localStorage.getItem('ner-language') === 'hi' ? 'hi' : 'en')")
source = source.replace('  const t = strings(language)', "  const [needsLanguage, setNeedsLanguage] = useState(() => !['en', 'hi'].includes(localStorage.getItem('ner-language') || ''))\n  const setLanguage = (next: Language) => { localStorage.setItem('ner-language', next); updateLanguage(next); setNeedsLanguage(false); document.documentElement.lang = next }\n  useEffect(() => { document.documentElement.lang = language }, [language])\n  const t = strings(language)")
source = source.replace('<FieldReports simulatedOffline=', '<FieldReports language={language} simulatedOffline=')
source = source.replace('  return <div className={emergency', '  if (needsLanguage) return <LanguageWelcome onChoose={setLanguage} />\n  return <div className={emergency')
fs.writeFileSync(path, source)
