// ─── Simple i18n: key-value translation map ────────────────────────────

export type Language = 'en' | 'hi';

export type TranslationKey =
  | 'dashboard'
  | 'marks'
  | 'subjects'
  | 'calendar'
  | 'settings'
  | 'onTrack'
  | 'belowThreshold'
  | 'needsAttention'
  | 'carryoverPapers'
  | 'attendance'
  | 'semester'
  | 'addSubject'
  | 'pyqBank'
  | 'societies'
  | 'profile'
  | 'gpa'
  | 'credits'
  | 'exitPoints';

const translations: Record<Language, Record<TranslationKey, string>> = {
  en: {
    dashboard: 'Dashboard',
    marks: 'Marks',
    subjects: 'Subjects',
    calendar: 'Calendar',
    settings: 'Settings',
    onTrack: 'On Track',
    belowThreshold: 'Below Threshold',
    needsAttention: 'Needs Attention',
    carryoverPapers: 'Carryover Papers',
    attendance: 'Attendance',
    semester: 'Semester',
    addSubject: 'Add Subject',
    pyqBank: 'PYQ Bank',
    societies: 'Societies',
    profile: 'Profile',
    gpa: 'GPA',
    credits: 'Credits',
    exitPoints: 'Exit Points',
  },
  hi: {
    dashboard: 'डैशबोर्ड',
    marks: 'अंक',
    subjects: 'विषय',
    calendar: 'कैलेंडर',
    settings: 'सेटिंग्स',
    onTrack: 'ट्रैक पर',
    belowThreshold: 'सीमा से नीचे',
    needsAttention: 'ध्यान आवश्यक',
    carryoverPapers: 'कैरीओवर पेपर',
    attendance: 'उपस्थिति',
    semester: 'सेमेस्टर',
    addSubject: 'विषय जोड़ें',
    pyqBank: 'PYQ बैंक',
    societies: 'सोसायटी',
    profile: 'प्रोफ़ाइल',
    gpa: 'GPA',
    credits: 'क्रेडिट',
    exitPoints: 'एग्जिट पॉइंट्स',
  },
};

// ─── Hook ─────────────────────────────────────────────────────────────

import { useStore } from '@/lib/store';

/**
 * Returns a `t(key)` translation function that uses the current
 * language from the persisted zustand store.
 */
export function useI18n() {
  const language = useStore((s) => s.language);

  function t(key: TranslationKey): string {
    return translations[language]?.[key] ?? translations.en[key] ?? key;
  }

  return { t, language };
}
