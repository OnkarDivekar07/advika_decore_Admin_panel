// src/layout/Panel.jsx
//
// Every page previously hand-wrote `<section className="bg-white
// rounded-lg shadow p-6">`. Centralizing it means the "card" look stays
// identical everywhere, and `min-w-0` is applied consistently — without
// it, a wide table inside a flex child can silently force the whole page
// to overflow horizontally instead of scrolling within the card.
const Panel = ({ as: Tag = 'section', className = '', children, ...rest }) => (
  <Tag className={`min-w-0 rounded-lg bg-white p-4 shadow sm:p-6 ${className}`} {...rest}>
    {children}
  </Tag>
);

export default Panel;
