interface SpeakTextOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  lang?: string;
  cancelOngoing?: boolean;
}

export const isSpeechSynthesisSupported = (): boolean => {
  return (
    typeof window !== 'undefined' &&
    typeof window.speechSynthesis !== 'undefined' &&
    typeof window.SpeechSynthesisUtterance !== 'undefined'
  );
};

export const stopSpeechSynthesis = (): void => {
  if (!isSpeechSynthesisSupported()) return;
  window.speechSynthesis.cancel();
};

export const speakText = (text: string, options: SpeakTextOptions = {}): boolean => {
  const content = text.trim();
  if (!content || !isSpeechSynthesisSupported()) return false;

  if (options.cancelOngoing !== false) {
    window.speechSynthesis.cancel();
  }

  const utterance = new SpeechSynthesisUtterance(content);
  utterance.rate = options.rate ?? 0.9;
  utterance.pitch = options.pitch ?? 1;
  utterance.volume = options.volume ?? 1;
  utterance.lang = options.lang ?? 'en-US';
  window.speechSynthesis.speak(utterance);
  return true;
};
