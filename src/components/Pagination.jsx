import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

function pageItems(page, lastPage) {
  const pages = [];
  for (const value of [1, page - 1, page, page + 1, lastPage]) {
    if (value >= 1 && value <= lastPage && !pages.includes(value)) pages.push(value);
  }
  pages.sort((a, b) => a - b);

  const items = [];
  pages.forEach((value, index) => {
    if (index > 0 && value - pages[index - 1] > 1) items.push(`ellipsis-${value}`);
    items.push(value);
  });
  return items;
}

export default function PaginationBar({
  page,
  totalPages,
  total,
  onPage,
  showLabel = true,
  align = 'center',
}) {
  const lastPage = Math.max(totalPages, 1);
  const goTo = (target) => (event) => {
    event.preventDefault();
    if (target >= 1 && target <= lastPage) onPage(target);
  };
  const disabled = 'pointer-events-none opacity-50';

  return (
    <div className="space-y-2">
      <Pagination>
        <PaginationContent
          className={align === 'right' ? 'justify-end' : align === 'left' ? 'justify-start' : undefined}
        >
          <PaginationItem>
            <PaginationPrevious
              href="#"
              onClick={goTo(page - 1)}
              aria-disabled={page <= 1}
              tabIndex={page <= 1 ? -1 : undefined}
              className={page <= 1 ? disabled : undefined}
            />
          </PaginationItem>

          {pageItems(page, lastPage).map((item) =>
            typeof item === 'string' ? (
              <PaginationItem key={item}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={item}>
                <PaginationLink
                  href="#"
                  isActive={item === page}
                  onClick={goTo(item)}
                  aria-label={`Go to page ${item}`}
                >
                  {item}
                </PaginationLink>
              </PaginationItem>
            ),
          )}

          <PaginationItem>
            <PaginationNext
              href="#"
              onClick={goTo(page + 1)}
              aria-disabled={page >= lastPage}
              tabIndex={page >= lastPage ? -1 : undefined}
              className={page >= lastPage ? disabled : undefined}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
      {showLabel && (
        <p className="text-center text-xs text-muted-foreground">
          Page {page} of {lastPage} · {total} total
        </p>
      )}
    </div>
  );
}
