// src/hooks/useDebouncedValue.js
import { useEffect, useState } from 'react';

// Returns `value`, but only after it has stopped changing for `delayMs`.
// Used so the Products search box doesn't fire a network request on every
// keystroke — the backend's own filtering/caching (paginateWithCache) does
// the real work, this just avoids hammering it.
const useDebouncedValue = (value, delayMs = 400) => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
};

export default useDebouncedValue;
