// src/layout/PageHeader.jsx
//
// Every admin page renders one of these right after the breadcrumb trail
// (which AdminLayout already provides) so the "title + primary actions"
// row looks and behaves the same everywhere, and wraps sanely instead of
// pushing action buttons off-screen on narrow viewports.
const PageHeader = ({ title, description, actions }) => (
  <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <div className="min-w-0">
      <h1 className="truncate text-xl font-semibold text-gray-900 sm:text-2xl">{title}</h1>
      {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
    </div>
    {actions && (
      <div className="flex flex-wrap items-center gap-2">{actions}</div>
    )}
  </div>
);

export default PageHeader;
