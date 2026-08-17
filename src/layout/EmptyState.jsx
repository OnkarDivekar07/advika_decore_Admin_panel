// src/layout/EmptyState.jsx
const EmptyState = ({ icon = 'inbox', title = 'Nothing here yet', description, action }) => (
  <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
    <i className={`fas fa-${icon} text-3xl text-gray-300`} aria-hidden="true"></i>
    <p className="font-medium text-gray-700">{title}</p>
    {description && <p className="max-w-sm text-sm text-gray-500">{description}</p>}
    {action && <div className="mt-2">{action}</div>}
  </div>
);

export default EmptyState;
