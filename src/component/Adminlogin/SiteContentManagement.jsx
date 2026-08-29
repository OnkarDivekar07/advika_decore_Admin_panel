// src/component/Adminlogin/SiteContentManagement.jsx
//
// Admin-editable, trilingual storefront text — GET/PATCH /api/content (see
// backend 2.0/src/modules/content and prisma/schema.prisma's SiteContent
// model). Whatever rows the backend has are what render here — no
// per-content-type code needed as more keys (category labels, footer
// info, ...) get added later, only more seeded rows.
import React, { useEffect, useState } from 'react';
import apiClient from '../../api/apiClient';
import LoadingState from '../../layout/LoadingState';
import ErrorState from '../../layout/ErrorState';
import EmptyState from '../../layout/EmptyState';
import Button from '../../layout/Button';

// A short, human label for each known key — falls back to the raw key
// itself for anything not listed yet (e.g. a future category/footer key),
// so this never blocks a new row from being editable the moment it's
// seeded.
const KEY_LABELS = {
  'ticker.cod': 'Ticker — Cash on Delivery',
  'ticker.shipping': 'Ticker — Free shipping line',
  'ticker.delivery': 'Ticker — Delivery estimate',
  'hero.eyebrow': 'Hero — Small label above headline',
  'hero.headlineLine1': 'Hero — Headline, line 1',
  'hero.headlineLine2': 'Hero — Headline, line 2 (orange)',
  'hero.headlineLine3': 'Hero — Headline, line 3',
  'hero.subhead': 'Hero — Description line',
  'vehiclePicker.title': 'Vehicle picker — Section title',
  'vehicleClass.small.label': 'Vehicle picker — Small vehicle name',
  'vehicleClass.small.examples': 'Vehicle picker — Small vehicle examples',
  'vehicleClass.medium.label': 'Vehicle picker — Medium vehicle name',
  'vehicleClass.medium.examples': 'Vehicle picker — Medium vehicle examples',
  'vehicleClass.big.label': 'Vehicle picker — Big vehicle name',
  'vehicleClass.big.examples': 'Vehicle picker — Big vehicle examples',
  'vehicleClass.tractor.label': 'Vehicle picker — Tractor name',
  'vehicleClass.tractor.examples': 'Vehicle picker — Tractor examples',
  'category.lights.label': 'Category — Lights (featured) name',
  'category.lights.examples': 'Category — Lights (featured) description',
  'category.lights.count': 'Category — Lights (featured) product count',
  'category.steering-cover.label': 'Category — Steering Cover name',
  'category.steering-cover.examples': 'Category — Steering Cover examples',
  'category.steering-cover.count': 'Category — Steering Cover product count',
  'category.tassels-hangings.label': 'Category — Tassels & Hangings name',
  'category.tassels-hangings.examples': 'Category — Tassels & Hangings examples',
  'category.tassels-hangings.count': 'Category — Tassels & Hangings product count',
  'category.rubber-matting.label': 'Category — Rubber & Matting name',
  'category.rubber-matting.examples': 'Category — Rubber & Matting examples',
  'category.rubber-matting.count': 'Category — Rubber & Matting product count',
  'category.garland-vine-flag.label': 'Category — Garland, Vine & Flag name',
  'category.garland-vine-flag.examples': 'Category — Garland, Vine & Flag examples',
  'category.garland-vine-flag.count': 'Category — Garland, Vine & Flag product count',
  'category.cloth-decoration.label': 'Category — Cloth Decoration name',
  'category.cloth-decoration.examples': 'Category — Cloth Decoration examples',
  'category.cloth-decoration.count': 'Category — Cloth Decoration product count',
  'category.fan-charger-horn.label': 'Category — Fan, Charger & Horn name',
  'category.fan-charger-horn.examples': 'Category — Fan, Charger & Horn examples',
  'category.fan-charger-horn.count': 'Category — Fan, Charger & Horn product count',
  'category.useful-items.label': 'Category — Useful Items name',
  'category.useful-items.examples': 'Category — Useful Items examples',
  'category.useful-items.count': 'Category — Useful Items product count',
  'category.mirror-wheelcap.label': 'Category — Mirror & Wheel Cap name',
  'category.mirror-wheelcap.examples': 'Category — Mirror & Wheel Cap examples',
  'category.mirror-wheelcap.count': 'Category — Mirror & Wheel Cap product count',
  'whatsapp.title': 'WhatsApp strip — Headline',
  'whatsapp.subtitle': 'WhatsApp strip — Subtext',
  'whatsapp.cta': 'WhatsApp strip — Button label',
  'trust.cod.title': 'Trust grid — Cash on delivery title',
  'trust.cod.body': 'Trust grid — Cash on delivery description',
  'trust.shipping.title': 'Trust grid — Fast shipping title',
  'trust.shipping.body': 'Trust grid — Fast shipping description',
  'trust.genuine.title': 'Trust grid — Genuine parts title',
  'trust.genuine.body': 'Trust grid — Genuine parts description',
  'trust.help.title': 'Trust grid — Hindi & Marathi help title',
  'trust.help.body': 'Trust grid — Hindi & Marathi help description',
  'reviews.title': 'Reviews — Section title',
  'reviews.score': 'Reviews — Average rating (e.g. 4.9)',
  'reviews.ratingCount': 'Reviews — Rating count line',
  'reviews.1.name': 'Reviews — #1 reviewer name',
  'reviews.1.meta': 'Reviews — #1 vehicle & city',
  'reviews.1.rating': 'Reviews — #1 star rating (1-5)',
  'reviews.1.text': 'Reviews — #1 review text',
  'reviews.2.name': 'Reviews — #2 reviewer name',
  'reviews.2.meta': 'Reviews — #2 vehicle & city',
  'reviews.2.rating': 'Reviews — #2 star rating (1-5)',
  'reviews.2.text': 'Reviews — #2 review text',
  'reviews.3.name': 'Reviews — #3 reviewer name',
  'reviews.3.meta': 'Reviews — #3 vehicle & city',
  'reviews.3.rating': 'Reviews — #3 star rating (1-5)',
  'reviews.3.text': 'Reviews — #3 review text',
  'footer.blurb': 'Footer — Brand description',
  'brand.phone': 'Business phone number (used site-wide for call/WhatsApp links)',
  'footer.hours': 'Footer — Business hours',
  'footer.address1': 'Footer — Address line 1',
  'footer.address2': 'Footer — Address line 2',
};

// Groups + orders rows to match the Landing page's actual top-to-bottom
// layout (HomePage.jsx: ticker -> hero -> vehicle picker -> categories ->
// WhatsApp strip -> trust grid -> reviews -> footer), rather than the
// backend's alphabetical-by-key order (GET /api/content orders by `key`
// asc) — so editing here reads the same order an admin sees scrolling
// the real page. `keys` lists exact keys in the order they should
// appear; `prefix` catches a whole family (e.g. every 'category.*' row)
// without hardcoding all 27 of them here one by one.
const SECTIONS = [
  { title: 'Ticker', keys: ['ticker.cod', 'ticker.shipping', 'ticker.delivery'] },
  { title: 'Hero banner', keys: ['hero.eyebrow', 'hero.headlineLine1', 'hero.headlineLine2', 'hero.headlineLine3', 'hero.subhead'] },
  {
    title: 'Vehicle picker',
    keys: [
      'vehiclePicker.title',
      'vehicleClass.small.label', 'vehicleClass.small.examples',
      'vehicleClass.medium.label', 'vehicleClass.medium.examples',
      'vehicleClass.big.label', 'vehicleClass.big.examples',
      'vehicleClass.tractor.label', 'vehicleClass.tractor.examples',
    ],
  },
  {
    title: 'Categories',
    prefix: 'category.',
    keys: [
      'category.lights.label', 'category.lights.examples', 'category.lights.count',
      'category.steering-cover.label', 'category.steering-cover.examples', 'category.steering-cover.count',
      'category.tassels-hangings.label', 'category.tassels-hangings.examples', 'category.tassels-hangings.count',
      'category.rubber-matting.label', 'category.rubber-matting.examples', 'category.rubber-matting.count',
      'category.garland-vine-flag.label', 'category.garland-vine-flag.examples', 'category.garland-vine-flag.count',
      'category.cloth-decoration.label', 'category.cloth-decoration.examples', 'category.cloth-decoration.count',
      'category.fan-charger-horn.label', 'category.fan-charger-horn.examples', 'category.fan-charger-horn.count',
      'category.useful-items.label', 'category.useful-items.examples', 'category.useful-items.count',
      'category.mirror-wheelcap.label', 'category.mirror-wheelcap.examples', 'category.mirror-wheelcap.count',
    ],
  },
  { title: 'WhatsApp strip', keys: ['whatsapp.title', 'whatsapp.subtitle', 'whatsapp.cta'] },
  {
    title: 'Trust grid',
    keys: [
      'trust.cod.title', 'trust.cod.body',
      'trust.shipping.title', 'trust.shipping.body',
      'trust.genuine.title', 'trust.genuine.body',
      'trust.help.title', 'trust.help.body',
    ],
  },
  {
    title: 'Driver reviews',
    prefix: 'reviews.',
    keys: [
      'reviews.title', 'reviews.score', 'reviews.ratingCount',
      'reviews.1.name', 'reviews.1.meta', 'reviews.1.rating', 'reviews.1.text',
      'reviews.2.name', 'reviews.2.meta', 'reviews.2.rating', 'reviews.2.text',
      'reviews.3.name', 'reviews.3.meta', 'reviews.3.rating', 'reviews.3.text',
    ],
  },
  { title: 'Footer', keys: ['footer.blurb', 'brand.phone', 'footer.hours', 'footer.address1', 'footer.address2'] },
];

// Sorts `items` into { title, items }[] following SECTIONS' order, with
// any row that doesn't match a listed key/prefix (e.g. a brand-new
// SiteContent row seeded but not yet added to SECTIONS above) collected
// into a trailing "Other" group — so a new key is always editable
// immediately, never silently hidden, even before this list catches up.
function groupBySection(items) {
  const byKey = new Map(items.map((item) => [item.key, item]));
  const used = new Set();
  const groups = SECTIONS.map((section) => {
    const sectionItems = section.keys
      .map((key) => byKey.get(key))
      .filter(Boolean);
    sectionItems.forEach((item) => used.add(item.key));
    if (section.prefix) {
      items.forEach((item) => {
        if (item.key.startsWith(section.prefix) && !used.has(item.key)) {
          sectionItems.push(item);
          used.add(item.key);
        }
      });
    }
    return { title: section.title, items: sectionItems };
  }).filter((group) => group.items.length > 0);

  const leftover = items.filter((item) => !used.has(item.key));
  if (leftover.length > 0) {
    groups.push({ title: 'Other', items: leftover });
  }
  return groups;
}

const LANGUAGES = [
  { field: 'valueEn', label: 'English' },
  { field: 'valueHi', label: 'Hindi' },
  { field: 'valueMr', label: 'Marathi' },
];

const SiteContentManagement = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Per-row edit buffer, keyed by content key — lets each row be edited
  // independently without a form-per-row component split.
  const [drafts, setDrafts] = useState({});
  const [savingKey, setSavingKey] = useState(null);
  const [rowErrors, setRowErrors] = useState({});
  const [banner, setBanner] = useState(null); // { tone: 'success' | 'error', message }

  useEffect(() => {
    if (!banner) return undefined;
    const timer = setTimeout(() => setBanner(null), 6000);
    return () => clearTimeout(timer);
  }, [banner]);

  const fetchContent = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get('/api/content');
      const list = Array.isArray(res.data.data) ? res.data.data : [];
      setItems(list);
      const nextDrafts = {};
      list.forEach((item) => {
        nextDrafts[item.key] = {
          valueEn: item.valueEn,
          valueHi: item.valueHi,
          valueMr: item.valueMr,
        };
      });
      setDrafts(nextDrafts);
    } catch (err) {
      console.error('Error fetching site content:', err);
      setError(err.response?.data?.message || 'Failed to load site content.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContent();
  }, []);

  const updateDraftField = (key, field, value) => {
    setDrafts((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
    setRowErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const isDirty = (item) => {
    const draft = drafts[item.key];
    if (!draft) return false;
    return (
      draft.valueEn !== item.valueEn ||
      draft.valueHi !== item.valueHi ||
      draft.valueMr !== item.valueMr
    );
  };

  const handleSave = async (key) => {
    const draft = drafts[key];
    if (!draft) return;

    setSavingKey(key);
    setRowErrors((prev) => ({ ...prev, [key]: undefined }));

    try {
      const res = await apiClient.patch(`/api/content/${encodeURIComponent(key)}`, draft);
      const updated = res.data.data;
      setItems((prev) => prev.map((item) => (item.key === key ? updated : item)));
      setBanner({ tone: 'success', message: `"${KEY_LABELS[key] || key}" updated.` });
    } catch (err) {
      console.error('Error updating site content:', err);
      setRowErrors((prev) => ({
        ...prev,
        [key]: err.response?.data?.message || 'Failed to save. Please try again.',
      }));
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div>
      <h3 className="mb-4 text-lg font-semibold text-gray-700">Site Text</h3>
      <p className="mb-4 text-sm text-gray-600">
        Wording shown on the storefront, editable in all three languages — changes take effect
        immediately, no code change needed.
      </p>

      {banner && (
        <div
          role="status"
          className={`mb-4 rounded-md border p-3 text-sm ${
            banner.tone === 'success'
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {banner.message}
        </div>
      )}

      {error && <ErrorState message={error} onRetry={fetchContent} className="mb-4" />}

      {loading ? (
        <LoadingState label="Loading site text…" />
      ) : items.length === 0 ? (
        <EmptyState icon="translate" title="No site text yet" description="Nothing has been seeded here yet." />
      ) : (
        <div className="space-y-8" data-testid="site-content-list">
          {groupBySection(items).map((group) => (
            <div key={group.title}>
              <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500" data-testid={`site-content-section-${group.title}`}>
                {group.title}
              </h4>
              <div className="space-y-4">
                {group.items.map((item) => {
                  const draft = drafts[item.key] || item;
                  const saving = savingKey === item.key;
                  const rowError = rowErrors[item.key];
                  return (
                    <div
                      key={item.key}
                      className="rounded-md border border-gray-200 p-4"
                      data-testid={`site-content-row-${item.key}`}
                    >
                      <p className="mb-3 text-sm font-medium text-gray-700">
                        {KEY_LABELS[item.key] || item.key}
                      </p>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        {LANGUAGES.map(({ field, label }) => (
                          <div key={field}>
                            <label
                              htmlFor={`site-content-${item.key}-${field}`}
                              className="mb-1 block text-xs font-medium text-gray-600"
                            >
                              {label}
                            </label>
                            <input
                              id={`site-content-${item.key}-${field}`}
                              type="text"
                              value={draft[field]}
                              onChange={(e) => updateDraftField(item.key, field, e.target.value)}
                              disabled={saving}
                              data-testid={`site-content-${item.key}-${field}-input`}
                              className="w-full rounded-md border border-gray-300 p-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-60"
                            />
                          </div>
                        ))}
                      </div>
                      {rowError && (
                        <p className="mt-2 text-sm text-red-600" role="alert" data-testid={`site-content-${item.key}-error`}>
                          {rowError}
                        </p>
                      )}
                      <div className="mt-3">
                        <Button
                          type="button"
                          variant="primary"
                          disabled={saving || !isDirty(item)}
                          aria-busy={saving || undefined}
                          onClick={() => handleSave(item.key)}
                          data-testid={`site-content-${item.key}-save-btn`}
                        >
                          {saving ? 'Saving…' : 'Save'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SiteContentManagement;
