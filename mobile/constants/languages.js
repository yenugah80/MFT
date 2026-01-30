/**
 * Supported Languages Configuration
 *
 * Languages supported for voice recognition, TTS, and UI
 * BCP-47 language codes used by @react-native-voice/voice and OpenAI Whisper
 */

export const SUPPORTED_LANGUAGES = {
  en: {
    code: 'en',
    locale: 'en-US',
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸',
    whisperCode: 'en',
    ttsCode: 'en-US',
  },
  es: {
    code: 'es',
    locale: 'es-ES',
    name: 'Spanish',
    nativeName: 'Español',
    flag: '🇪🇸',
    whisperCode: 'es',
    ttsCode: 'es-ES',
  },
  hi: {
    code: 'hi',
    locale: 'hi-IN',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    flag: '🇮🇳',
    whisperCode: 'hi',
    ttsCode: 'hi-IN',
  },
  te: {
    code: 'te',
    locale: 'te-IN',
    name: 'Telugu',
    nativeName: 'తెలుగు',
    flag: '🇮🇳',
    whisperCode: 'te',
    ttsCode: 'te-IN',
  },
  zh: {
    code: 'zh',
    locale: 'zh-CN',
    name: 'Chinese',
    nativeName: '中文',
    flag: '🇨🇳',
    whisperCode: 'zh',
    ttsCode: 'zh-CN',
  },
  fr: {
    code: 'fr',
    locale: 'fr-FR',
    name: 'French',
    nativeName: 'Français',
    flag: '🇫🇷',
    whisperCode: 'fr',
    ttsCode: 'fr-FR',
  },
  ta: {
    code: 'ta',
    locale: 'ta-IN',
    name: 'Tamil',
    nativeName: 'தமிழ்',
    flag: '🇮🇳',
    whisperCode: 'ta',
    ttsCode: 'ta-IN',
  },
  kn: {
    code: 'kn',
    locale: 'kn-IN',
    name: 'Kannada',
    nativeName: 'ಕನ್ನಡ',
    flag: '🇮🇳',
    whisperCode: 'kn',
    ttsCode: 'kn-IN',
  },
  mr: {
    code: 'mr',
    locale: 'mr-IN',
    name: 'Marathi',
    nativeName: 'मराठी',
    flag: '🇮🇳',
    whisperCode: 'mr',
    ttsCode: 'mr-IN',
  },
  de: {
    code: 'de',
    locale: 'de-DE',
    name: 'German',
    nativeName: 'Deutsch',
    flag: '🇩🇪',
    whisperCode: 'de',
    ttsCode: 'de-DE',
  },
};

// Ordered list for UI display (most common first)
export const LANGUAGE_ORDER = ['en', 'hi', 'te', 'ta', 'es', 'zh', 'fr', 'kn', 'mr', 'de'];

// Get language config by code
export const getLanguageConfig = (code) => {
  return SUPPORTED_LANGUAGES[code] || SUPPORTED_LANGUAGES.en;
};

// Get locale for speech recognition (e.g., 'en-US', 'hi-IN')
export const getSpeechLocale = (code) => {
  return getLanguageConfig(code).locale;
};

// Get language code for OpenAI Whisper (e.g., 'en', 'hi')
export const getWhisperCode = (code) => {
  return getLanguageConfig(code).whisperCode;
};

// Get language code for TTS (e.g., 'en-US', 'hi-IN')
export const getTTSCode = (code) => {
  return getLanguageConfig(code).ttsCode;
};

// Get ordered list of language options for UI
export const getLanguageOptions = () => {
  return LANGUAGE_ORDER.map(code => ({
    ...SUPPORTED_LANGUAGES[code],
    label: `${SUPPORTED_LANGUAGES[code].flag} ${SUPPORTED_LANGUAGES[code].name}`,
    value: code,
  }));
};

export default SUPPORTED_LANGUAGES;
