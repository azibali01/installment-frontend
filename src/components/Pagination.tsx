import React from "react";

type Props = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (p: number) => void;
  onPageSizeChange?: (s: number) => void;
};

const Pagination: React.FC<Props> = ({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-t">
      <div className="text-sm text-slate-600">
        Showing {total === 0 ? 0 : Math.min(total, (page - 1) * pageSize + 1)} -{" "}
        {Math.min(total, page * pageSize)} of {total}
      </div>
      <div className="flex items-center gap-2">
        {onPageSizeChange && (
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="px-2 py-1 border rounded bg-white text-sm"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        )}
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="px-3 py-1 border rounded bg-white text-sm"
        >
          Prev
        </button>
        <div className="flex items-center gap-1">
          {pages.map((p) => (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`px-2 py-1 text-sm border rounded ${
                page === p ? "bg-blue-600 text-white" : "bg-white"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="px-3 py-1 border rounded bg-white text-sm"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default Pagination;
