export type Language = 'en' | 'hi'
const copy = { en: { dashboard: 'Dashboard', map: 'Live Map', routes: 'Route Intelligence', vehicles: 'Vehicles', incidents: 'Incidents', alerts: 'Alerts', districts: 'Districts', emergency: 'Emergency Operations', reports: 'Field Reports', settings: 'Settings' }, hi: { dashboard: 'डैशबोर्ड', map: 'लाइव मानचित्र', routes: 'मार्ग इंटेलिजेंस', vehicles: 'वाहन', incidents: 'घटनाएँ', alerts: 'अलर्ट', districts: 'जिले', emergency: 'आपात संचालन', reports: 'फील्ड रिपोर्ट', settings: 'सेटिंग्स' } }
export const strings = (language: Language) => copy[language]
