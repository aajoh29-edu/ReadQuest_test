import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, RotateCcw, ShieldCheck, Sparkles } from 'lucide-react';
import { Navigate, useParams } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { useAuth } from '../contexts/AuthContext';
import { questRepository } from '../services/repository';
import { ReadAloudActivity, VoiceAttemptResult } from '../types';

export const ReadAloudView: React.FC = () => {
  const { activityId = '' } = useParams();
  const { status: authStatus, activeChild } = useAuth();
  const [activity, setActivity] = useState<ReadAloudActivity | null>(null);
  const [consentGranted, setConsentGranted] = useState(false);
  const [consentSaving, setConsentSaving] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [wordConfidences, setWordConfidences] = useState<number[]>([]);
  const [result, setResult] = useState<VoiceAttemptResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const stopTimerRef = useRef<number | null>(null);
  const transcriptionRef = useRef({ text: '', confidences: [] as number[] });

  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  useEffect(() => {
    if (!activityId) return;
    questRepository
      .getReadAloudActivity(activityId)
      .then(setActivity)
      .catch((err) => setError(err.message || 'Could not load this read-aloud activity.'));
  }, [activityId]);

  useEffect(
    () => () => {
      recognitionRef.current?.abort();
      if (stopTimerRef.current !== null) {
        window.clearTimeout(stopTimerRef.current);
      }
    },
    []
  );

  if (authStatus === 'loading') {
    return <div className="min-h-[50vh]" />;
  }
  if (authStatus !== 'authenticated' || !activeChild) {
    return <Navigate to={`/login?returnTo=${encodeURIComponent(`/read-aloud/${activityId}`)}`} replace />;
  }

  const grantConsent = async () => {
    setConsentSaving(true);
    setError(null);
    try {
      await questRepository.setVoiceConsent(true);
      setConsentGranted(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not save voice consent.';
      setError(message);
    } finally {
      setConsentSaving(false);
    }
  };

  const submitTranscript = async (
    spokenText: string,
    confidences: number[],
    startedAt: number
  ) => {
    if (!spokenText.trim() || !activity) return;
    setIsSubmitting(true);
    try {
      const duration = Math.max(0.1, Math.min(60, (Date.now() - startedAt) / 1000));
      const attempt = await questRepository.submitReadAloud(
        activity.activity_id,
        spokenText,
        confidences,
        duration
      );
      setResult(attempt);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not score this attempt.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const startRecording = () => {
    if (!Recognition || !activity) {
      setError('This browser does not support speech recognition. Try a recent Chrome or Edge browser.');
      return;
    }
    setError(null);
    setTranscript('');
    setWordConfidences([]);
    transcriptionRef.current = { text: '', confidences: [] };
    startedAtRef.current = Date.now();
    const recognition = new Recognition();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      let finalText = '';
      const confidenceWords: number[] = [];
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const item = event.results[index];
        if (!item.isFinal) continue;
        const alternative = item[0];
        finalText += `${alternative.transcript} `;
        confidenceWords.push(
          ...Array.from(
            { length: alternative.transcript.trim().split(/\\s+/).filter(Boolean).length },
            () => alternative.confidence || 0
          )
        );
      }
      if (finalText.trim()) {
        const prior = transcriptionRef.current.text;
        const spokenText = `${prior} ${finalText}`.trim();
        const nextConfidences = [
          ...transcriptionRef.current.confidences,
          ...confidenceWords,
        ];
        transcriptionRef.current = { text: spokenText, confidences: nextConfidences };
        setTranscript(spokenText);
        setWordConfidences(nextConfidences);
      }
    };
    recognition.onerror = (event) => {
      setIsListening(false);
      if (event.error !== 'no-speech') {
        setError(`Speech recognition stopped: ${event.error}.`);
      } else {
        setError('I did not hear any words. Take a breath and try again.');
      }
    };
    recognition.onend = () => {
      setIsListening(false);
      if (stopTimerRef.current !== null) {
        window.clearTimeout(stopTimerRef.current);
        stopTimerRef.current = null;
      }
      const startedAt = startedAtRef.current;
      const captured = transcriptionRef.current;
      if (startedAt && captured.text.trim()) {
        void submitTranscript(captured.text, captured.confidences, startedAt);
      }
    };
    recognitionRef.current = recognition;
    setIsListening(true);
    recognition.start();
    stopTimerRef.current = window.setTimeout(() => recognition.stop(), 60000);
  };

  const stopRecording = () => recognitionRef.current?.stop();

  const retry = () => {
    setResult(null);
    setTranscript('');
    setWordConfidences([]);
    setError(null);
  };

  if (!activity) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        {error ? <p role="alert" className="font-bold text-rose-700">{error}</p> : 'Loading read-aloud practice...'}
      </div>
    );
  }

  if (!consentGranted) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12">
        <div className="rounded-3xl border-2 border-[#DED5FF] bg-white p-7 text-center space-y-5">
          <ShieldCheck className="mx-auto h-14 w-14 text-[#8274D8]" />
          <h1 className="text-2xl font-black text-[#171B37]">Guardian voice permission</h1>
          <p className="text-sm font-semibold leading-relaxed text-[#5C5E7B]">
            To score read-aloud practice, this browser will send the text transcript and word
            confidence values to ReadQuest. No audio is uploaded or stored on ReadQuest.
          </p>
          <Button isLoading={consentSaving} onClick={grantConsent}>
            I consent for {activeChild.name}
          </Button>
          {error && <p role="alert" className="text-sm font-bold text-rose-700">{error}</p>}
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center space-y-6">
        <Sparkles className="mx-auto h-14 w-14 text-[#FF9B67]" />
        <h1 className="text-3xl font-black text-[#171B37]">
          {result.retry_words.length ? 'Great reading. Let’s practice a few words!' : 'Wonderful reading!'}
        </h1>
        <p className="font-semibold text-[#6B6E8A]">
          Your effort helps every reading adventure feel easier.
        </p>
        {result.retry_words.length > 0 && (
          <div className="rounded-3xl border-2 border-[#DED5FF] bg-white p-6">
            <p className="mb-4 text-xs font-black uppercase tracking-wider text-[#8274D8]">Try these words again</p>
            <div className="flex flex-wrap justify-center gap-2">
              {result.retry_words.map((word) => (
                <span key={word} className="rounded-2xl bg-[#FFF5EA] px-4 py-2 text-lg font-black text-[#171B37]">{word}</span>
              ))}
            </div>
          </div>
        )}
        <Button icon={<RotateCcw className="h-4 w-4" />} onClick={retry}>Read again</Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6 pb-28 md:pb-12">
      <header className="text-center space-y-2">
        <p className="text-xs font-black uppercase tracking-widest text-[#8274D8]">{activity.title}</p>
        <h1 className="text-3xl font-black text-[#171B37]">Read it aloud</h1>
      </header>
      <section className="rounded-[32px] border-2 border-[#DED5FF] bg-white px-7 py-10 text-center shadow-xs">
        <p className="text-2xl sm:text-3xl font-serif leading-relaxed text-[#171B37]">{activity.text}</p>
      </section>
      <div className="text-center space-y-4">
        {transcript && (
          <p className="rounded-2xl bg-[#F2EEFF] p-4 text-sm font-semibold text-[#5843C4]">
            Heard: “{transcript}”
          </p>
        )}
        <Button
          size="xl"
          variant={isListening ? 'navy' : 'peach'}
          icon={isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          onClick={isListening ? stopRecording : startRecording}
          disabled={isSubmitting}
          isLoading={isSubmitting}
        >
          {isListening ? 'Stop reading' : isSubmitting ? 'Checking words...' : 'Start reading'}
        </Button>
        <p className="text-xs font-bold text-[#6B6E8A]">
          Read naturally. The microphone stays on for one attempt, up to 60 seconds.
        </p>
        {wordConfidences.length > 0 && isSubmitting && (
          <p className="sr-only">Captured {wordConfidences.length} word confidence values.</p>
        )}
        {error && <p role="alert" className="text-sm font-bold text-rose-700">{error}</p>}
      </div>
    </div>
  );
};
