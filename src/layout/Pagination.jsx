// src/layout/Pagination.jsx
//
// Renders directly off the backend's pagination meta shape
// ({ page, limit, total, totalPages } — see utils/paginateWithCache.js),
// so any screen backed by that helper can drop this in without
// re-deriving page counts itself.
import Button from './Button';

const Pagination = ({ page, totalPages, total, onPageChange }) => {
  if (!total || totalPages <= 1) return null;

  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div className="mt-4 flex flex-col items-center justify-between gap-3 border-t border-gray-200 pt-4 sm:flex-row">
      <p className="text-sm text-gray-500">
        Page {page} of {totalPages} <span className="text-gray-400">({total} total)</span>
      </p>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          disabled={!canPrev}
          onClick={() => onPageChange(page - 1)}
        >
          <i className="fas fa-chevron-left" aria-hidden="true"></i>
          Previous
        </Button>
        <Button
          variant="secondary"
          disabled={!canNext}
          onClick={() => onPageChange(page + 1)}
        >
          Next
          <i className="fas fa-chevron-right" aria-hidden="true"></i>
        </Button>
      </div>
    </div>
  );
};

export default Pagination;
