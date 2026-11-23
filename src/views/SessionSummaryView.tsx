import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Trophy,
  Star,
  CheckCircle,
  XCircle,
  Award,
  ArrowRight,
  Home,
  RotateCcw,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { questRepository } from '../services/repository';
import { AdaptiveRecommendation, LearnerProfile, Lesson, SessionRecord } from '../types';
import { Trophy3DIllustration } from '../components/illustrations/ReadingIllustrations';
import { Button } from '../components/common/Button';
import { formatAccuracy } from '../utils/formatAccuracy';

export const SessionSummaryView: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<SessionRecord | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [profile, setProfile] = useState<LearnerProfile | null>(null);
  const [recommendedLesson, setRecommendedLesson] = useState<Lesson | null>(null);
  const [adaptiveRec, setAdaptiveRec] = useState<AdaptiveRecommendation | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) {
      navigate('/dashboard');
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    questRepository
      .getSession(sessionId)
      .then(async (foundSession) => {
        if (!isMounted) return;
        if (!foundSession) {
          navigate('/dashboard');
          return;
        }

        setSession(foundSession);

        const [loadedLesson, currentProfile, recLesson, adaptRec] = await Promise.all([
          questRepository.getLesson(foundSession.lessonId),
          questRepository.getLearnerProfile(),
          questRepository.getRecommendedLesson(),
          questRepository.getAdaptiveRecommendation(),
        ]);

        if (!isMounted) return;
        setLesson(loadedLesson);
        setProfile(currentProfile);
        setRecommendedLesson(recLesson);
        setAdaptiveRec(adaptRec);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching session', err);
        if (isMounted) navigate('/dashboard');
      });

    return () => {
      isMounted = false;
    };
  }, [sessionId, navigate]);

  if (isLoading || !session || !lesson || !profile) {
    return (
      <div className="min-h-[500px] flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-[#8274D8] border-t-transparent rounded-full animate-spin" />
          <p className="font-bold text-[#171B37]">Calculating your Quest Results...</p>
        </div>
      </div>
    );
  }

  const isPerfectScore = session.score === session.totalQuestions;
  const isPassed = session.accuracy >= 0.6;
  const starsEarnedThisSession = session.score * 3 + (isPerfectScore ? 5 : 0);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 pb-28 md:pb-12 animate-in fade-in duration-300">
      {/* 1. Quest Complete Celebration Card */}
      <div className="bg-white border-2 border-[#DED5FF] rounded-3xl p-6 sm:p-10 shadow-md text-center space-y-6 relative overflow-hidden">
        {/* Visual Trophy Illustration */}
        <div className="flex justify-center -mb-2">
          <Trophy3DIllustration className="w-24 h-24 sm:w-28 sm:h-28" />
        </div>

        <div className="space-y-1.5">
          <span className="inline-flex items-center gap-1.5 font-black text-xs uppercase tracking-wider bg-[#F2EEFF] text-[#8274D8] px-3.5 py-1 rounded-full">
            <Sparkles className="w-3.5 h-3.5" />
            Reading Adventure Accomplished
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-[#171B37] tracking-tight">
            Quest Complete!
          </h1>
          <p className="text-sm sm:text-base font-semibold text-[#6B6E8A] max-w-md mx-auto">
            {isPerfectScore
              ? `Tremendous job! You mastered all ${session.totalQuestions} reading questions!`
              : `Great effort! You practiced ${lesson.categoryName} and earned new reading stars!`}
          </p>
        </div>

        {/* Results & Earned Rewards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 max-w-lg mx-auto">
          <div className="bg-[#F2EEFF] border border-[#DED5FF] rounded-2xl p-3 sm:p-4 text-center">
            <span className="block text-2xl sm:text-3xl font-black text-[#171B37]">
              {session.score}/{session.totalQuestions || 5}
            </span>
            <span className="text-[11px] font-black text-[#6B6E8A] uppercase tracking-wider">
              Score
            </span>
          </div>

          <div className="bg-[#EAF5F7] border border-[#DED5FF] rounded-2xl p-3 sm:p-4 text-center">
            <span className="block text-2xl sm:text-3xl font-black text-[#8274D8]">
              {formatAccuracy(session.accuracy)}
            </span>
            <span className="text-[11px] font-black text-[#6B6E8A] uppercase tracking-wider">
              Accuracy
            </span>
          </div>

          <div className="bg-[#FFF5EA] border border-[#FFC38E] rounded-2xl p-3 sm:p-4 text-center">
            <div className="flex items-center justify-center gap-1 text-2xl sm:text-3xl font-black text-[#171B37]">
              <Star className="w-5 h-5 fill-amber-400 text-amber-500" />
              <span>+{starsEarnedThisSession}</span>
            </div>
            <span className="text-[11px] font-black text-[#D84315] uppercase tracking-wider">
              Stars Gained
            </span>
          </div>

          <div className="bg-[#FAF8FD] border border-[#DED5FF] rounded-2xl p-3 sm:p-4 text-center">
            <span className="block text-xl sm:text-2xl font-black text-[#171B37] mt-0.5">
              {Math.max(1, Math.round((session.totalActiveDurationSeconds || 30) / 60))}m
            </span>
            <span className="text-[11px] font-black text-[#6B6E8A] uppercase tracking-wider">
              Active Time
            </span>
          </div>
        </div>

        {/* Earned Badge Callout */}
        {session.earnedBadge && (
          <div className="bg-[#F2EEFF] border-2 border-[#DED5FF] rounded-2xl p-4 max-w-sm mx-auto flex items-center justify-center gap-3">
            <Award className="w-7 h-7 text-[#8274D8] shrink-0" />
            <div className="text-left">
              <span className="text-[10px] font-black uppercase text-[#8274D8] block">
                Quest Reward Unlocked
              </span>
              <span className="text-sm font-extrabold text-[#171B37]">
                {session.earnedBadge}
              </span>
            </div>
          </div>
        )}

        {/* Skills Practiced Panel */}
        {/* Skills Practiced Panel */}
        <div className="bg-[#EAF5F7] border border-[#DED5FF] rounded-2xl p-4 max-w-md mx-auto text-left space-y-1.5">
          <span className="text-xs font-black uppercase tracking-wider text-[#8274D8] flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5" />
            Skills Practiced
          </span>
          <p className="text-xs sm:text-sm font-bold text-[#171B37]">
            {lesson.categoryName}: {lesson.title}
          </p>
          <p className="text-xs text-[#6B6E8A]">
            {lesson.subtitle}
          </p>
        </div>

        {/* Adaptive Engine Next Step Recommendation Card */}
        {adaptiveRec && (
          <div className="bg-[#FAF8FD] border-2 border-[#8274D8]/40 rounded-2xl p-4 max-w-md mx-auto text-left space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-[#8274D8] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#FF8A65]" />
                Next Adaptive Recommendation
              </span>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#EAF5F7] text-[#171B37]">
                Tier {adaptiveRec.priorityTier} · {adaptiveRec.priorityLabel}
              </span>
            </div>

            <p className="text-sm font-black text-[#171B37]">
              {adaptiveRec.lessonTitle}
            </p>

            <p className="text-xs font-bold text-[#4A3B69]">
              "{adaptiveRec.childFriendlyReason}"
            </p>

            <p className="text-[11px] font-semibold text-[#6B6E8A] leading-relaxed pt-1 border-t border-[#DED5FF]">
              <strong className="text-[#171B37]">Adult explanation: </strong>
              {adaptiveRec.adultFacingExplanation}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          {recommendedLesson && recommendedLesson.id !== lesson.id ? (
            <Button
              variant="peach"
              size="lg"
              onClick={() => navigate(`/activity/${recommendedLesson.id}`)}
              icon={<ArrowRight className="w-5 h-5 stroke-[3]" />}
              iconPosition="right"
              className="w-full sm:w-auto"
            >
              Continue to {recommendedLesson.title}
            </Button>
          ) : (
            <Button
              variant="peach"
              size="lg"
              onClick={() => navigate('/library')}
              icon={<ArrowRight className="w-5 h-5 stroke-[3]" />}
              iconPosition="right"
              className="w-full sm:w-auto"
            >
              Pick Another Quest
            </Button>
          )}

          <Button
            variant="outline"
            size="lg"
            onClick={() => navigate('/dashboard')}
            icon={<Home className="w-4 h-4" />}
            className="w-full sm:w-auto"
          >
            Dashboard
          </Button>
        </div>
      </div>

      {/* 2. Question-by-Question Review Breakdown */}
      <div className="bg-white border-2 border-[#DED5FF] rounded-3xl p-6 sm:p-8 space-y-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-[#EAF5F7] pb-3">
          <div>
            <h2 className="text-xl font-black text-[#171B37]">
              Answer Review
            </h2>
            <p className="text-xs font-semibold text-[#6B6E8A]">
              Review what was practiced during this quest.
            </p>
          </div>
          <span className="text-xs font-extrabold bg-[#F2EEFF] text-[#8274D8] px-3 py-1 rounded-full">
            5 of 5 Answered
          </span>
        </div>

        <div className="space-y-3">
          {(lesson.activities || lesson.questions || []).map((question, index) => {
            const answer = session.answers.find((a) => a.questionId === question.id);
            const isCorrect = Boolean(answer?.isCorrect);
            const selectedOpt = question.options.find((o) => o.id === answer?.selectedOptionId);

            return (
              <div
                key={question.id}
                className={`p-4 rounded-2xl border-2 transition-all ${
                  isCorrect
                    ? 'border-emerald-200 bg-emerald-50/40'
                    : 'border-amber-200 bg-amber-50/40'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      isCorrect ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'
                    }`}
                  >
                    {isCorrect ? (
                      <CheckCircle className="w-4 h-4 stroke-[2.5]" />
                    ) : (
                      <XCircle className="w-4 h-4 stroke-[2.5]" />
                    )}
                  </div>

                  <div className="space-y-1 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-[#6B6E8A]">
                        Question {index + 1}
                      </span>
                      <span
                        className={`text-xs font-black px-2 py-0.5 rounded-full ${
                          isCorrect
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {isCorrect ? 'Correct (+3 Stars)' : 'Reviewed'}
                      </span>
                    </div>

                    <h3 className="text-sm sm:text-base font-extrabold text-[#171B37]">
                      {question.prompt}
                    </h3>

                    {question.contextSentenceWithBlank && (
                      <p className="text-xs sm:text-sm font-semibold text-[#6B6E8A] italic">
                        "{question.contextSentenceWithBlank}"
                      </p>
                    )}

                    <div className="flex items-center gap-2 pt-1 text-xs">
                      <span className="font-bold text-[#6B6E8A]">Selected:</span>
                      <span className="font-extrabold text-[#171B37] bg-white px-2 py-0.5 rounded-lg border border-[#DED5FF]">
                        {selectedOpt ? selectedOpt.label : 'None'}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-[#6B6E8A] pt-1">
                      💡 {answer?.explanation || question.explanation}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
