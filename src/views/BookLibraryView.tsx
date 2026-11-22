import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { questRepository } from '../services/repository';
import { BookSummary } from '../types';

const PAGE_SIZE = 12;

const sourceLabel = (source: BookSummary['source']) =>
  source === 'licensed_edition' ? 'Licensed edition' : source === 'public_domain' ? 'Public domain' : 'ReadQuest original';

export const BookLibraryView: React.FC = () => {
  const navigate = useNavigate();
  const [books, setBooks] = useState<BookSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [level, setLevel] = useState('');
  const [category, setCategory] = useState('');
  const [query, setQuery] = useState('');
  const [offset, setOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBooks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await questRepository.getBooks({
        level: level ? Number(level) : undefined,
        category: category || undefined,
        searchQuery: query,
        limit: PAGE_SIZE,
        offset,
      });
      setBooks(response.items);
      setTotal(response.total);
    } catch (err) {
      console.error('[BookLibraryView] Failed to load books:', err);
      setBooks([]);
      setTotal(0);
      setError('The book library is temporarily unavailable. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [category, level, offset, query]);

  useEffect(() => {
    void loadBooks();
  }, [loadBooks]);

  const categories = useMemo(
    () => Array.from(new Set(books.map((book) => book.category))).sort(),
    [books]
  );
  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const updateLevel = (value: string) => {
    setLevel(value);
    setOffset(0);
  };
  const updateCategory = (value: string) => {
    setCategory(value);
    setOffset(0);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 pb-28 md:pb-12">
      <header className="space-y-2">
        <p className="text-xs font-black uppercase tracking-widest text-[#8274D8]">Pleasure reading</p>
        <h1 className="text-3xl sm:text-4xl font-black text-[#171B37]">
          Choose a <span className="italic font-serif font-normal text-[#8274D8]">book</span>
        </h1>
        <p className="text-sm font-semibold text-[#6B6E8A]">
          Read at your own pace. Every published book is ready to read aloud—no quiz required.
        </p>
      </header>

      <div className="grid sm:grid-cols-[1fr_auto_auto] gap-3 rounded-3xl bg-white border-2 border-[#DED5FF] p-4">
        <label className="flex items-center gap-3 min-h-11 rounded-2xl bg-[#FAF8FD] px-4">
          <Search className="w-4 h-4 text-[#8274D8]" aria-hidden="true" />
          <span className="sr-only">Search books</span>
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setOffset(0);
            }}
            placeholder="Search title, author, or category"
            className="min-w-0 flex-1 bg-transparent text-sm font-bold text-[#171B37] outline-none"
          />
        </label>
        <select
          value={level}
          onChange={(event) => updateLevel(event.target.value)}
          aria-label="Filter books by level"
          className="rounded-2xl border border-[#DED5FF] bg-white px-4 py-2.5 text-sm font-bold text-[#171B37]"
        >
          <option value="">All levels</option>
          {[1, 2, 3, 4, 5].map((item) => (
            <option key={item} value={item}>Level {item}</option>
          ))}
        </select>
        <select
          value={category}
          onChange={(event) => updateCategory(event.target.value)}
          aria-label="Filter books by category"
          className="rounded-2xl border border-[#DED5FF] bg-white px-4 py-2.5 text-sm font-bold text-[#171B37]"
        >
          <option value="">All categories</option>
          {categories.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="py-16 flex justify-center">
          <div className="w-10 h-10 border-4 border-[#8274D8] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="rounded-3xl border-2 border-[#DED5FF] bg-white p-8 text-center space-y-4">
          <p className="font-bold text-[#171B37]">{error}</p>
          <Button onClick={loadBooks} size="sm">Try again</Button>
        </div>
      ) : books.length === 0 ? (
        <div className="rounded-3xl border-2 border-[#DED5FF] bg-white p-8 text-center">
          <p className="font-bold text-[#171B37]">No published books match those filters.</p>
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {books.map((book, index) => (
              <article
                key={book.id}
                className="flex min-h-64 flex-col rounded-3xl border-2 border-[#DED5FF] bg-white p-5 shadow-xs transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div
                  className={`mb-5 flex h-28 items-center justify-center rounded-2xl ${
                    ['bg-[#EAF5F7]', 'bg-[#FFF5EA]', 'bg-[#F2EEFF]'][index % 3]
                  }`}
                  aria-hidden="true"
                >
                  <BookOpen className="h-12 w-12 text-[#5843C4]" />
                </div>
                <div className="flex items-center justify-between gap-3 text-[11px] font-black uppercase tracking-wide">
                  <span className="text-[#8274D8]">Level {book.level}</span>
                  <span className="text-[#6B6E8A]">{book.word_count} words</span>
                </div>
                <h2 className="mt-2 text-xl font-black leading-snug text-[#171B37]">{book.title}</h2>
                <p className="text-xs font-bold text-[#6B6E8A]">by {book.author}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-extrabold">
                  <span className="rounded-full bg-[#F2EEFF] px-2.5 py-1 text-[#5843C4] capitalize">{book.category}</span>
                  <span className="rounded-full bg-[#EAF5F7] px-2.5 py-1 text-[#315D63]">{sourceLabel(book.source)}</span>
                </div>
                <Button
                  className="mt-auto w-full pt-3"
                  size="sm"
                  variant="peach"
                  onClick={() => navigate(`/books/${encodeURIComponent(book.id)}`)}
                >
                  Read book
                </Button>
              </article>
            ))}
          </div>

          <div className="flex items-center justify-between rounded-3xl bg-white border border-[#DED5FF] p-3">
            <Button
              size="sm"
              variant="outline"
              icon={<ChevronLeft className="h-4 w-4" />}
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            >
              Previous
            </Button>
            <span className="text-xs font-extrabold text-[#6B6E8A]">
              Page {page} of {pageCount}
            </span>
            <Button
              size="sm"
              variant="outline"
              icon={<ChevronRight className="h-4 w-4" />}
              iconPosition="right"
              disabled={offset + PAGE_SIZE >= total}
              onClick={() => setOffset(offset + PAGE_SIZE)}
            >
              Next
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
