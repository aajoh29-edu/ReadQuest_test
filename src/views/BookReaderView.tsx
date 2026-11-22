import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight, ExternalLink, Star } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { useAuth } from '../contexts/AuthContext';
import { questRepository } from '../services/repository';
import { BookDetail } from '../types';

export const BookReaderView: React.FC = () => {
  const { bookId = '' } = useParams();
  const navigate = useNavigate();
  const { status: authStatus, activeChild, refreshAuth } = useAuth();
  const startedAt = useRef(Date.now());
  const [book, setBook] = useState<BookDetail | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [sentenceIndex, setSentenceIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [starsAwarded, setStarsAwarded] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const startedProgress = useRef(false);

  useEffect(() => {
    let active = true;
    questRepository.getBook(bookId)
      .then((result) => {
        if (!active) return;
        setBook(result);
        if (!result) setError('That book is not published or could not be found.');
      })
      .catch((err) => {
        console.error('[BookReaderView] Failed to load book:', err);
        if (active) setError('The book is temporarily unavailable.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [bookId]);

  const minutesRead = useCallback(
    () => Math.max(1, Math.ceil((Date.now() - startedAt.current) / 60000)),
    []
  );

  useEffect(() => {
    if (
      !book ||
      startedProgress.current ||
      authStatus !== 'authenticated' ||
      !activeChild
    ) return;
    startedProgress.current = true;
    void questRepository
      .updateBookProgress(book.id, {
        status: 'started',
        last_page: 1,
        minutes_read: 0,
      })
      .catch((err) => console.error('[BookReaderView] Failed to save start progress:', err));
  }, [activeChild, authStatus, book]);

  const pages = book?.content.pages ?? [];
  const currentPage = pages[pageIndex];
  const currentSentence = currentPage?.sentences[sentenceIndex] ?? '';
  const totalSentences = useMemo(
    () => pages.reduce((sum, page) => sum + page.sentences.length, 0),
    [pages]
  );
  const sentencesBeforePage = useMemo(
    () => pages.slice(0, pageIndex).reduce((sum, page) => sum + page.sentences.length, 0),
    [pageIndex, pages]
  );
  const globalSentence = sentencesBeforePage + sentenceIndex + 1;
  const isLast = pageIndex === pages.length - 1 &&
    sentenceIndex === (currentPage?.sentences.length ?? 1) - 1;

  const savePageProgress = async (lastPage: number) => {
    if (authStatus !== 'authenticated' || !activeChild || !book) return;
    await questRepository.updateBookProgress(book.id, {
      status: 'started',
      last_page: lastPage,
      minutes_read: minutesRead(),
    });
  };

  const next = () => {
    if (!currentPage || isLast) return;
    if (sentenceIndex < currentPage.sentences.length - 1) {
      setSentenceIndex((value) => value + 1);
      return;
    }
    const nextPage = pageIndex + 1;
    setPageIndex(nextPage);
    setSentenceIndex(0);
    void savePageProgress(nextPage + 1).catch((err) =>
      console.error('[BookReaderView] Failed to save page progress:', err)
    );
  };

  const previous = () => {
    if (sentenceIndex > 0) {
      setSentenceIndex((value) => value - 1);
    } else if (pageIndex > 0) {
      const previousPage = pageIndex - 1;
      setPageIndex(previousPage);
      setSentenceIndex(pages[previousPage].sentences.length - 1);
    }
  };

  const finish = async () => {
    if (!book) return;
    if (authStatus !== 'authenticated' || !activeChild) {
      navigate(`/login?returnTo=${encodeURIComponent(`/books/${book.id}`)}`);
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const progress = await questRepository.updateBookProgress(book.id, {
        status: 'finished',
        last_page: pages.length,
        minutes_read: minutesRead(),
      });
      setStarsAwarded(progress.stars_awarded);
      setIsFinished(true);
      await refreshAuth();
    } catch (err) {
      console.error('[BookReaderView] Failed to finish book:', err);
      setError('We could not save your finished book. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="min-h-[50vh] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-[#8274D8] border-t-transparent rounded-full animate-spin" />
    </div>;
  }

  if (!book || !currentPage) {
    return <div className="max-w-xl mx-auto p-8 text-center space-y-4">
      <p className="font-bold text-[#171B37]">{error || 'This book has no readable pages.'}</p>
      <Button variant="outline" onClick={() => navigate('/books')}>Back to books</Button>
    </div>;
  }

  if (isFinished) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-5">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-12 w-12 text-emerald-600" />
        </div>
        <h1 className="text-3xl font-black text-[#171B37]">You finished {book.title}!</h1>
        {starsAwarded > 0 && (
          <p className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-2 font-black text-amber-800">
            <Star className="h-5 w-5 fill-amber-400 text-amber-500" />
            +{starsAwarded} star
          </p>
        )}
        <p className="font-semibold text-[#6B6E8A]">Book finished. No quiz needed.</p>
        <Button onClick={() => navigate('/books')}>Find another book</Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-5 pb-28 md:pb-12">
      <button
        onClick={() => navigate('/books')}
        className="inline-flex items-center gap-2 text-sm font-extrabold text-[#5843C4]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to books
      </button>

      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-[#8274D8]">Level {book.level} · {book.category}</p>
          <h1 className="text-2xl sm:text-3xl font-black text-[#171B37]">{book.title}</h1>
          <p className="text-sm font-bold text-[#6B6E8A]">by {book.author}</p>
        </div>
        <span className="text-xs font-extrabold text-[#6B6E8A]">
          Sentence {globalSentence} of {totalSentences}
        </span>
      </header>

      <div className="h-2 overflow-hidden rounded-full bg-[#EEE9FF]">
        <div
          className="h-full rounded-full bg-[#8274D8] transition-all"
          style={{ width: `${(globalSentence / Math.max(totalSentences, 1)) * 100}%` }}
        />
      </div>

      <section className="flex min-h-80 flex-col items-center justify-center rounded-[32px] border-2 border-[#DED5FF] bg-white px-7 py-10 text-center shadow-sm">
        <p className="mb-7 text-[11px] font-black uppercase tracking-widest text-[#8274D8]">
          Page {pageIndex + 1} of {pages.length}
        </p>
        <p className="max-w-2xl text-2xl sm:text-3xl font-serif leading-relaxed text-[#171B37]">
          {currentSentence}
        </p>
      </section>

      <div className="flex items-center justify-between gap-3">
        <Button
          variant="outline"
          icon={<ChevronLeft className="h-4 w-4" />}
          disabled={globalSentence === 1}
          onClick={previous}
        >
          Previous
        </Button>
        {isLast ? (
          <Button
            variant="success"
            isLoading={isSaving}
            onClick={finish}
          >
            Finish book
          </Button>
        ) : (
          <Button
            variant="peach"
            icon={<ChevronRight className="h-4 w-4" />}
            iconPosition="right"
            onClick={next}
          >
            Next sentence
          </Button>
        )}
      </div>

      {error && <p role="alert" className="text-sm font-bold text-rose-700 text-center">{error}</p>}

      <details className="rounded-3xl border border-[#DED5FF] bg-white p-5">
        <summary className="cursor-pointer text-sm font-black text-[#171B37]">Credits and source</summary>
        <div className="mt-4 space-y-3 text-xs font-semibold leading-relaxed text-[#5C5E7B]">
          <p><strong>Edition:</strong> {book.attribution.source_title}</p>
          <div>
            <strong>Credits</strong>
            <ul className="mt-1 list-disc pl-5 space-y-1">
              {book.attribution.creator_credits.map((credit) => <li key={credit}>{credit}</li>)}
            </ul>
          </div>
          <p>{book.attribution.copyright_notice}</p>
          <p>{book.attribution.reformatting_note}</p>
          {book.attribution.sourcing_notes.map((note) => <p key={note}>{note}</p>)}
          <div className="flex flex-wrap gap-4 pt-1">
            {book.attribution.edition_url && (
              <a className="inline-flex items-center gap-1 text-[#5843C4] underline" href={book.attribution.edition_url} target="_blank" rel="noreferrer">
                Edition <ExternalLink className="h-3 w-3" />
              </a>
            )}
            {book.attribution.license_url && (
              <a className="inline-flex items-center gap-1 text-[#5843C4] underline" href={book.attribution.license_url} target="_blank" rel="noreferrer">
                License <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      </details>
    </div>
  );
};
