import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LogOut, Check, ArrowLeft, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { questRepository } from '../services/repository';
import { Activity, GradedAnswer, Lesson, SessionRecord } from '../types';
import { ActivePracticeTimer } from '../services/timerService';
import { ProgressBar } from '../components/common/ProgressBar';
import { Button } from '../components/common/Button';
import { QuestionRenderer } from '../components/activity/QuestionRenderer';
import { FeedbackBanner } from '../components/activity/FeedbackBanner';

export const ActivityPlayerView: React.FC = () => {
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [session, setSession] = useState<SessionRecord | null>(null);
  const [currentActivityIndex, setCurrentActivityIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [gradedAnswer, setGradedAnswer] = useState<GradedAnswer | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingNext, setIsLoadingNext] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active Practice Timer ref
  const timerRef = useRef<ActivePracticeTimer | null>(null);

  useEffect(() => {
    // Instantiate practice timer with 300s cap and 60s idle timeout
    const timer = new ActivePracticeTimer(300, 60);
    timerRef.current = timer;

    return () => {
      timer.destroy();
      timerRef.current = null;
    };
  }, []);

  // Initialize or resume session
  const initSession = useCallback(async () => {
    if (!lessonId) {
      navigate('/dashboard');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [loadedLesson, activeSession] = await Promise.all([
        questRepository.getLesson(lessonId),
        questRepository.startOrCreateSession(lessonId),
      ]);

      if (!loadedLesson) {
        setErrorMessage('This reading quest could not be found.');
        setIsLoading(false);
        return;
      }

      setLesson(loadedLesson);
      setSession(activeSession);

      // Safe resume index
      const activitiesList = activeSession.activities ?? loadedLesson.activities ?? loadedLesson.questions ?? [];
      const resumeIndex = Math.min(
        activeSession.currentActivityIndex ?? activeSession.currentQuestionIndex ?? 0,
        Math.max(0, activitiesList.length - 1)
      );
      setCurrentActivityIndex(resumeIndex);

      // Check if current activity was already answered in this session
      const currentAct = activitiesList[resumeIndex];
      const prevAnswer = activeSession.answers.find((a) => a.questionId === currentAct?.id);
      if (prevAnswer) {
        setSelectedOptionId(prevAnswer.selectedOptionId);
        setGradedAnswer(prevAnswer);
      } else {
        setSelectedOptionId(null);
        setGradedAnswer(null);
        timerRef.current?.start();
      }

      setIsLoading(false);
    } catch (err) {
      console.error('Error starting session:', err);
      setErrorMessage('We had trouble loading this quest. Please try again.');
      setIsLoading(false);
    }
  }, [lessonId, navigate]);

  useEffect(() => {
    initSession();
  }, [initSession]);

  const activities = session?.activities ?? lesson?.activities ?? lesson?.questions ?? [];
  const currentActivity: Activity | undefined = activities[currentActivityIndex];
  const isLastActivity = Boolean(activities.length > 0 && currentActivityIndex === activities.length - 1);
  const isSubmitted = Boolean(gradedAnswer);

  // Handle option select
  const handleSelectOption = (optionId: string) => {
    if (isSubmitted || isSubmitting) return; // prevent double clicks
    setSelectedOptionId(optionId);
  };

  // Submit Answer with Idempotency Key & Active Duration Tracking
  const handleSubmitAnswer = async () => {
    if (!session || !currentActivity || !selectedOptionId || isSubmitting || isSubmitted) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    // Stop timer to capture active duration
    const activeSeconds = timerRef.current ? timerRef.current.stop() : 15;

    // Generate unique idempotency key
    const idempotencyKey = `idem_${session.id}_${currentActivity.id}_${selectedOptionId}_${session.attempts.length + 1}`;

    try {
      const result = await questRepository.submitAnswer(
        session.id,
        currentActivity.id,
        selectedOptionId,
        idempotencyKey,
        activeSeconds
      );
      setSession(result.session);
      setGradedAnswer(result.gradedAnswer);
    } catch (err: any) {
      console.error('Error submitting answer:', err);
      setErrorMessage(err.message || 'Failed to submit answer. Please try again.');
      // Resume timer if submission failed
      timerRef.current?.resume();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Advance to next activity or session summary
  const handleNextActivity = async () => {
    if (!session || !lesson || isLoadingNext) return;

    setIsLoadingNext(true);
    try {
      if (isLastActivity) {
        // Complete the session
        const completed = await questRepository.completeSession(session.id);
        navigate(`/summary/${completed.id}`);
      } else {
        // Advance to next activity
        const updated = await questRepository.advanceSessionQuestion(session.id);
        setSession(updated);
        const nextIndex = currentActivityIndex + 1;
        setCurrentActivityIndex(nextIndex);

        // Reset inputs and restart active timer
        setSelectedOptionId(null);
        setGradedAnswer(null);
        timerRef.current?.start();

        // Scroll top gently
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      console.error('Error advancing activity:', err);
      setErrorMessage('Could not proceed to the next activity. Please try again.');
    } finally {
      setIsLoadingNext(false);
    }
  };

  // Pause timer when exit modal opens
  const handleOpenExitModal = () => {
    timerRef.current?.pause();
    setShowExitModal(true);
  };

  const handleCloseExitModal = () => {
    setShowExitModal(false);
    if (!isSubmitted) {
      timerRef.current?.resume();
    }
  };

  // Keyboard navigation shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (showExitModal || !currentActivity) return;

      if (e.key === 'Escape') {
        handleOpenExitModal();
        return;
      }

      if (e.key === 'Enter') {
        if (isSubmitted) {
          handleNextActivity();
        } else if (selectedOptionId && !isSubmitting) {
          handleSubmitAnswer();
        }
        return;
      }

      if (!isSubmitted && ['1', '2', '3', '4'].includes(e.key)) {
        const optionIndex = parseInt(e.key, 10) - 1;
        if (currentActivity.options[optionIndex]) {
          setSelectedOptionId(currentActivity.options[optionIndex].id);
        }
      }
    },
    [showExitModal, currentActivity, isSubmitted, selectedOptionId, isSubmitting]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Loading State
  if (isLoading) {
    return (
      <div className="min-h-[500px] flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-[#8274D8] border-t-transparent rounded-full animate-spin" />
          <p className="font-extrabold text-[#171B37]">Loading your Reading Quest...</p>
        </div>
      </div>
    );
  }

  // Error State
  if (errorMessage && !currentActivity) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-white border-2 border-red-200 rounded-3xl text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-black text-[#171B37]">Unable to Load Quest</h2>
        <p className="text-xs text-[#6B6E8A]">{errorMessage}</p>
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/library')}>
            Back to Library
          </Button>
          <Button variant="peach" size="sm" onClick={initSession}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Empty State
  if (!lesson || activities.length === 0 || !currentActivity) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white border-2 border-[#DED5FF] rounded-3xl text-center space-y-3">
        <p className="font-bold text-[#171B37]">No activities found in this lesson.</p>
        <Button variant="peach" size="md" onClick={() => navigate('/library')}>
          Return to Lesson Library
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-100px)] py-6 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Top Activity Header */}
        <div className="flex items-center justify-between gap-4 bg-white border-2 border-[#DED5FF] rounded-3xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenExitModal}
              className="p-2.5 rounded-2xl bg-[#F2EEFF] hover:bg-[#DED5FF] text-[#171B37] transition-colors cursor-pointer"
              title="Pause and exit quest"
              aria-label="Pause and exit quest"
            >
              <LogOut className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase text-[#8274D8] tracking-wider block">
                  {lesson.categoryName} Quest
                </span>
                <span className="text-[10px] font-extrabold text-[#6B6E8A] bg-[#EAF5F7] px-2 py-0.5 rounded-full">
                  {lesson.readingLevelName.split('·')[0]}
                </span>
              </div>
              <h1 className="text-base sm:text-lg font-black text-[#171B37] truncate max-w-[200px] sm:max-w-md">
                {lesson.title}
              </h1>
            </div>
          </div>

          {/* Progress Indicator */}
          <div className="flex items-center gap-3 min-w-[140px] sm:min-w-[180px]">
            <div className="flex-1">
              <div className="flex justify-between items-center text-xs font-black text-[#171B37] mb-1">
                <span>Activity</span>
                <span>
                  {currentActivityIndex + 1} of {activities.length}
                </span>
              </div>
              <ProgressBar
                value={currentActivityIndex + (isSubmitted ? 1 : 0)}
                max={activities.length}
                color="purple"
                height="sm"
              />
            </div>
          </div>
        </div>

        {/* Transient Error Banner if answer submission failed */}
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center justify-between">
            <span>{errorMessage}</span>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-xs text-red-600 hover:underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Main Interactive Question Card */}
        <main
          className="bg-white border-2 border-[#DED5FF] rounded-3xl p-6 sm:p-8 lg:p-10 shadow-sm space-y-8"
          aria-label={`Activity ${currentActivityIndex + 1} of ${activities.length}`}
        >
          <QuestionRenderer
            question={currentActivity}
            selectedOptionId={selectedOptionId}
            onSelectOption={handleSelectOption}
            isSubmitted={isSubmitted}
            correctOptionId={gradedAnswer?.correctOptionId}
          />

          {/* Bottom Action Area: Check Answer button or Feedback Banner */}
          {!isSubmitted ? (
            <div className="pt-4 border-t border-[#EAF5F7] flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-[#6B6E8A] flex items-center gap-1.5 font-bold">
                <Clock className="w-3.5 h-3.5 text-[#8274D8]" />
                <span>Active focus mode • Press 1–4 to select & Enter to submit</span>
              </div>

              <Button
                variant="peach"
                size="lg"
                disabled={!selectedOptionId || isSubmitting}
                isLoading={isSubmitting}
                onClick={handleSubmitAnswer}
                icon={<Check className="w-5 h-5 stroke-[3]" />}
                iconPosition="right"
                className="w-full sm:w-auto min-w-[180px]"
              >
                {isSubmitting ? 'Checking...' : 'Check Answer'}
              </Button>
            </div>
          ) : (
            <FeedbackBanner
              gradedAnswer={gradedAnswer}
              onNext={handleNextActivity}
              isLastQuestion={isLastActivity}
              isLoadingNext={isLoadingNext}
            />
          )}
        </main>
      </div>

      {/* Exit & Resume Modal */}
      {showExitModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/40 backdrop-blur-xs animate-in fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="exit-modal-title"
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 border-2 border-[#DED5FF] shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center text-2xl mx-auto">
              ⏸️
            </div>

            <div className="text-center space-y-1">
              <h2 id="exit-modal-title" className="text-2xl font-black text-[#171B37]">
                Take a reading break?
              </h2>
              <p className="text-sm font-semibold text-[#6B6E8A] leading-relaxed">
                Your progress is safely saved at{' '}
                <strong className="text-[#171B37]">
                  Activity {currentActivityIndex + 1} of {activities.length}
                </strong>
                . Active timing is paused and you can resume this quest whenever you are ready!
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button
                variant="outline"
                size="md"
                onClick={handleCloseExitModal}
              >
                Keep Playing
              </Button>
              <Button
                variant="peach"
                size="md"
                onClick={() => navigate('/dashboard')}
              >
                Save & Exit
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
