/**
 * Widget UI string translations by language code.
 * Used for chatbot widget header, placeholder, states, button label, etc.
 */

export const WIDGET_LANGUAGES: { code: string; name: string }[] = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'nl', name: 'Dutch' },
  { code: 'ru', name: 'Russian' },
  { code: 'tr', name: 'Turkish' },
];

export type WidgetTranslationKey =
  | 'chatTitle'
  | 'openChat'
  | 'placeholder'
  | 'emptyMessage'
  | 'errorMessage'
  | 'loadingMessage'
  | 'noConfigMessage'
  | 'contactSupport'
  | 'chooseLanguage'
  | 'continue'
  | 'minimize'
  | 'maximize'
  | 'close';

type TranslationMap = Record<WidgetTranslationKey, string>;

const translations: Record<string, TranslationMap> = {
  en: {
    chatTitle: 'Chat Assistant',
    openChat: 'Open chat',
    placeholder: 'Type your message...',
    emptyMessage: 'Starting conversation...',
    errorMessage: "Sorry, I'm having trouble. Please try again.",
    loadingMessage: 'Thinking...',
    noConfigMessage: 'No chatbot is configured for this website.',
    contactSupport: 'Please contact support or check the configuration.',
    chooseLanguage: 'Choose your language',
    continue: 'Continue',
    minimize: 'Minimize',
    maximize: 'Maximize',
    close: 'Close',
  },
  es: {
    chatTitle: 'Asistente de chat',
    openChat: 'Abrir chat',
    placeholder: 'Escribe tu mensaje...',
    emptyMessage: 'Iniciando conversación...',
    errorMessage: 'Lo siento, tengo problemas. Por favor, inténtalo de nuevo.',
    loadingMessage: 'Pensando...',
    noConfigMessage: 'No hay un chatbot configurado para este sitio.',
    contactSupport: 'Por favor contacta con soporte o revisa la configuración.',
    chooseLanguage: 'Elige tu idioma',
    continue: 'Continuar',
    minimize: 'Minimizar',
    maximize: 'Maximizar',
    close: 'Cerrar',
  },
  fr: {
    chatTitle: 'Assistant de chat',
    openChat: 'Ouvrir le chat',
    placeholder: 'Tapez votre message...',
    emptyMessage: 'Démarrage de la conversation...',
    errorMessage: "Désolé, j'ai des difficultés. Veuillez réessayer.",
    loadingMessage: 'Réflexion...',
    noConfigMessage: "Aucun chatbot n'est configuré pour ce site.",
    contactSupport: 'Veuillez contacter le support ou vérifier la configuration.',
    chooseLanguage: 'Choisissez votre langue',
    continue: 'Continuer',
    minimize: 'Réduire',
    maximize: 'Agrandir',
    close: 'Fermer',
  },
  de: {
    chatTitle: 'Chat-Assistent',
    openChat: 'Chat öffnen',
    placeholder: 'Nachricht eingeben...',
    emptyMessage: 'Gespräch wird gestartet...',
    errorMessage: 'Entschuldigung, es gibt ein Problem. Bitte versuchen Sie es erneut.',
    loadingMessage: 'Denke nach...',
    noConfigMessage: 'Für diese Website ist kein Chatbot konfiguriert.',
    contactSupport: 'Bitte kontaktieren Sie den Support oder überprüfen Sie die Konfiguration.',
    chooseLanguage: 'Wählen Sie Ihre Sprache',
    continue: 'Weiter',
    minimize: 'Minimieren',
    maximize: 'Maximieren',
    close: 'Schließen',
  },
  it: {
    chatTitle: 'Assistente chat',
    openChat: 'Apri chat',
    placeholder: 'Scrivi il tuo messaggio...',
    emptyMessage: 'Avvio conversazione...',
    errorMessage: 'Scusa, ho dei problemi. Riprova.',
    loadingMessage: 'Sto pensando...',
    noConfigMessage: 'Nessun chatbot configurato per questo sito.',
    contactSupport: 'Contatta il supporto o verifica la configurazione.',
    chooseLanguage: 'Scegli la tua lingua',
    continue: 'Continua',
    minimize: 'Riduci',
    maximize: 'Ingrandisci',
    close: 'Chiudi',
  },
  pt: {
    chatTitle: 'Assistente de chat',
    openChat: 'Abrir chat',
    placeholder: 'Digite sua mensagem...',
    emptyMessage: 'Iniciando conversa...',
    errorMessage: 'Desculpe, estou com problemas. Tente novamente.',
    loadingMessage: 'Pensando...',
    noConfigMessage: 'Nenhum chatbot configurado para este site.',
    contactSupport: 'Entre em contato com o suporte ou verifique a configuração.',
    chooseLanguage: 'Escolha seu idioma',
    continue: 'Continuar',
    minimize: 'Minimizar',
    maximize: 'Maximizar',
    close: 'Fechar',
  },
  ar: {
    chatTitle: 'مساعد الدردشة',
    openChat: 'فتح الدردشة',
    placeholder: 'اكتب رسالتك...',
    emptyMessage: 'بدء المحادثة...',
    errorMessage: 'عذراً، أواجه مشكلة. يرجى المحاولة مرة أخرى.',
    loadingMessage: 'جاري التفكير...',
    noConfigMessage: 'لا يوجد روبوت دردشة مهيأ لهذا الموقع.',
    contactSupport: 'يرجى الاتصال بالدعم أو التحقق من الإعدادات.',
    chooseLanguage: 'اختر لغتك',
    continue: 'متابعة',
    minimize: 'تصغير',
    maximize: 'تكبير',
    close: 'إغلاق',
  },
  hi: {
    chatTitle: 'चैट सहायक',
    openChat: 'चैट खोलें',
    placeholder: 'अपना संदेश लिखें...',
    emptyMessage: 'बातचीत शुरू हो रही है...',
    errorMessage: 'क्षमा करें, समस्या हो रही है। कृपया पुनः प्रयास करें।',
    loadingMessage: 'सोच रहा हूं...',
    noConfigMessage: 'इस वेबसाइट के लिए कोई चैटबॉट कॉन्फ़िगर नहीं है।',
    contactSupport: 'कृपया सहायता से संपर्क करें या कॉन्फ़िगरेशन जांचें।',
    chooseLanguage: 'अपनी भाषा चुनें',
    continue: 'जारी रखें',
    minimize: 'छोटा करें',
    maximize: 'बड़ा करें',
    close: 'बंद करें',
  },
  zh: {
    chatTitle: '聊天助手',
    openChat: '打开聊天',
    placeholder: '输入您的消息...',
    emptyMessage: '正在开始对话...',
    errorMessage: '抱歉，遇到问题。请重试。',
    loadingMessage: '思考中...',
    noConfigMessage: '本网站未配置聊天机器人。',
    contactSupport: '请联系支持或检查配置。',
    chooseLanguage: '选择您的语言',
    continue: '继续',
    minimize: '最小化',
    maximize: '最大化',
    close: '关闭',
  },
  ja: {
    chatTitle: 'チャットアシスタント',
    openChat: 'チャットを開く',
    placeholder: 'メッセージを入力...',
    emptyMessage: '会話を開始しています...',
    errorMessage: '申し訳ありません。問題が発生しました。もう一度お試しください。',
    loadingMessage: '考え中...',
    noConfigMessage: 'このウェブサイト用のチャットボットは設定されていません。',
    contactSupport: 'サポートにお問い合わせいただくか、設定をご確認ください。',
    chooseLanguage: '言語を選択',
    continue: '続ける',
    minimize: '最小化',
    maximize: '最大化',
    close: '閉じる',
  },
  ko: {
    chatTitle: '채팅 도우미',
    openChat: '채팅 열기',
    placeholder: '메시지를 입력하세요...',
    emptyMessage: '대화를 시작하는 중...',
    errorMessage: '죄송합니다. 문제가 발생했습니다. 다시 시도해 주세요.',
    loadingMessage: '생각 중...',
    noConfigMessage: '이 웹사이트용 챗봇이 구성되지 않았습니다.',
    contactSupport: '지원팀에 문의하거나 구성을 확인하세요.',
    chooseLanguage: '언어 선택',
    continue: '계속',
    minimize: '최소화',
    maximize: '최대화',
    close: '닫기',
  },
  nl: {
    chatTitle: 'Chatassistent',
    openChat: 'Chat openen',
    placeholder: 'Typ uw bericht...',
    emptyMessage: 'Gesprek starten...',
    errorMessage: 'Sorry, er is een probleem. Probeer het opnieuw.',
    loadingMessage: 'Denken...',
    noConfigMessage: 'Er is geen chatbot geconfigureerd voor deze website.',
    contactSupport: 'Neem contact op met ondersteuning of controleer de configuratie.',
    chooseLanguage: 'Kies uw taal',
    continue: 'Doorgaan',
    minimize: 'Minimaliseren',
    maximize: 'Maximaliseren',
    close: 'Sluiten',
  },
  ru: {
    chatTitle: 'Чат-помощник',
    openChat: 'Открыть чат',
    placeholder: 'Введите сообщение...',
    emptyMessage: 'Начало разговора...',
    errorMessage: 'Извините, возникла проблема. Попробуйте снова.',
    loadingMessage: 'Думаю...',
    noConfigMessage: 'Для этого сайта не настроен чат-бот.',
    contactSupport: 'Обратитесь в поддержку или проверьте настройки.',
    chooseLanguage: 'Выберите язык',
    continue: 'Продолжить',
    minimize: 'Свернуть',
    maximize: 'Развернуть',
    close: 'Закрыть',
  },
  tr: {
    chatTitle: 'Sohbet Asistanı',
    openChat: 'Sohbeti aç',
    placeholder: 'Mesajınızı yazın...',
    emptyMessage: 'Sohbet başlatılıyor...',
    errorMessage: 'Üzgünüm, bir sorun oluştu. Lütfen tekrar deneyin.',
    loadingMessage: 'Düşünüyor...',
    noConfigMessage: 'Bu site için yapılandırılmış sohbet botu yok.',
    contactSupport: 'Lütfen destekle iletişime geçin veya yapılandırmayı kontrol edin.',
    chooseLanguage: 'Dilinizi seçin',
    continue: 'Devam',
    minimize: 'Küçült',
    maximize: 'Büyüt',
    close: 'Kapat',
  },
};

/** Get display name for a language code (e.g. "Spanish" for "es") */
export function getLanguageName(code: string): string {
  return WIDGET_LANGUAGES.find((l) => l.code === code)?.name ?? code;
}

/** Get translation map for a language; falls back to English if missing */
export function getWidgetTranslations(langCode: string): TranslationMap {
  return translations[langCode] ?? translations.en;
}

/** Merge translated UI strings into a skin config (shallow clone with overrides) */
export function applyWidgetTranslations<T extends { theme?: unknown; components?: unknown; states?: unknown }>(
  config: T,
  langCode: string
): T {
  const t = getWidgetTranslations(langCode);
  const components = config.components && typeof config.components === 'object' ? config.components : {};
  const states = config.states && typeof config.states === 'object' ? config.states : {};
  return {
    ...config,
    components: {
      ...components,
      button: components && 'button' in components && typeof (components as any).button === 'object'
        ? { ...(components as any).button, label: (components as any).button?.label ?? t.openChat }
        : { label: t.openChat },
      header: components && 'header' in components
        ? { ...(components as any).header, title: (components as any).header?.title ?? t.chatTitle }
        : { title: t.chatTitle },
      input: components && 'input' in components
        ? { ...(components as any).input, placeholder: (components as any).input?.placeholder ?? t.placeholder }
        : { placeholder: t.placeholder },
    },
    states: {
      ...states,
      loading: states && 'loading' in states
        ? { ...(states as any).loading, message: (states as any).loading?.message ?? t.loadingMessage }
        : { message: t.loadingMessage },
      empty: states && 'empty' in states
        ? { ...(states as any).empty, message: (states as any).empty?.message ?? t.emptyMessage }
        : { message: t.emptyMessage },
      error: states && 'error' in states
        ? { ...(states as any).error, message: (states as any).error?.message ?? t.errorMessage }
        : { message: t.errorMessage },
    },
  };
}
