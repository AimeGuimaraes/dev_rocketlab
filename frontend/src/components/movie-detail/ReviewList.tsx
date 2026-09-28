import { useReviews } from '../../api/hooks';
import type { ReviewRead } from '../../api/types';
import { formatDateTime } from '../../lib/format';
import { Pagination } from '../Pagination';
import { RatingDisplay } from '../RatingDisplay';
import { EmptyState, ErrorState } from '../StatusMessage';

const REVIEWS_PAGE_SIZE = 10;

const buttonClass =
  'mt-2 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 focus-visible:outline-none';

interface ReviewListProps {
  movieId: string;
  page: number;
  onPageChange: (page: number) => void;
}

function ReviewItem({ review }: { review: ReviewRead }) {
  return (
    <article className="py-4 first:pt-0 last:pb-0">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <h3 className="font-semibold text-slate-900">{review.nome}</h3>
        <time dateTime={review.created_at} className="text-sm text-slate-500">
          {formatDateTime(review.created_at)}
        </time>
      </header>
      <div className="mt-1">
        <RatingDisplay size="sm" value={review.nota} />
      </div>
      <p className="mt-2 whitespace-pre-line text-slate-700">{review.comentario}</p>
    </article>
  );
}

function ReviewSkeleton() {
  return (
    <div aria-hidden="true" className="animate-pulse py-4 first:pt-0">
      <div className="flex justify-between">
        <div className="h-4 w-32 rounded bg-slate-200" />
        <div className="h-3 w-24 rounded bg-slate-200" />
      </div>
      <div className="mt-2 h-3.5 w-24 rounded bg-slate-200" />
      <div className="mt-3 h-3 w-full rounded bg-slate-200" />
      <div className="mt-1.5 h-3 w-2/3 rounded bg-slate-200" />
    </div>
  );
}

/** Avaliações do filme, mais recentes primeiro, paginadas pela URL. */
export function ReviewList({ movieId, page, onPageChange }: ReviewListProps) {
  const { data, error, isPending, isPlaceholderData, isFetching, refetch } = useReviews(
    movieId,
    page,
    REVIEWS_PAGE_SIZE,
  );

  if (isPending) {
    return (
      <div className="divide-y divide-slate-100">
        <p className="sr-only" role="status">
          Carregando avaliações…
        </p>
        {Array.from({ length: 3 }, (_, index) => (
          <ReviewSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState message={error.detail} onRetry={() => void refetch()} retrying={isFetching} />
    );
  }

  if (data.total === 0) {
    return <EmptyState title="Ainda não há avaliações para este filme." />;
  }

  if (data.items.length === 0) {
    return (
      <EmptyState title="Página de avaliações não encontrada">
        <button type="button" onClick={() => onPageChange(1)} className={buttonClass}>
          Ir para a primeira página
        </button>
      </EmptyState>
    );
  }

  return (
    <>
      <div
        aria-busy={isPlaceholderData}
        className={`divide-y divide-slate-100 transition-opacity ${isPlaceholderData ? 'opacity-60' : ''}`}
      >
        {data.items.map((review) => (
          <ReviewItem key={review.sk_movie_review_id} review={review} />
        ))}
      </div>
      {data.pages > 1 && (
        <Pagination
          page={page}
          pages={data.pages}
          total={data.total}
          itemLabel={['avaliação', 'avaliações']}
          onPageChange={onPageChange}
        />
      )}
    </>
  );
}
