import { useState } from 'react'
import type { Language } from '../i18n'
export function LanguageWelcome({ onChoose }: { onChoose: (language: Language) => void }) {
  const [choice, setChoice] = useState<Language>('en')
  return <div className="language-welcome"><section><span className="eyebrow">NER SENTINEL</span><h1>Choose your language<br /><span>अपनी भाषा चुनें</span></h1><p>You can change this anytime in Settings.<br />आप इसे सेटिंग्स में कभी भी बदल सकते हैं।</p><div role="group" aria-label="Portal language">{(['en','hi'] as Language[]).map(lang => <button key={lang} aria-pressed={choice === lang} onClick={() => setChoice(lang)}><strong>{lang === 'en' ? 'English' : 'हिन्दी'}</strong><span>{lang === 'en' ? 'English' : 'Hindi'}</span></button>)}</div><button className="button primary" onClick={() => onChoose(choice)}>{choice === 'hi' ? 'पोर्टल खोलें →' : 'Continue to portal →'}</button></section></div>
}
