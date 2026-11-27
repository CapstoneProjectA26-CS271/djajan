// Caption rules shared by the prompt builder and the caption validator (docs/AI_SPEC.md). The endpoint that uses
// them (POST /api/admin/ai/captions) is built in T16.

/** Caption styles, following the owner's own categories. Default request order: promo, soft_selling, interaksi. */
export const CAPTION_STYLES = ['promo', 'soft_selling', 'interaksi'];

// Wording that promises an offer. Only allowed when the owner filled a promo price in the form; otherwise the
// LLM would be inventing a deal the shop never agreed to. Patterns are matched case-insensitively on whole words
// so food words such as "potongan ayam" or "100% keju" do not trip them.
const OFFER_PATTERNS = [
  /\bgratis\w*/giu,
  /\bfree\b/giu,
  /\bdiskon\w*/giu,
  /\bdisc(?:ount)?\b/giu,
  /\bpromo\w*/giu,
  /\bpotongan\s+harga\b/giu,
  /\bcash\s?back\b/giu,
  /\bvoucher\w*/giu,
  /\bkupon\b/giu,
  /\bbonus\b/giu,
  /\bflash\s?sale\b/giu,
  /\bharga\s+(?:spesial|special|khusus|coret|miring)\b/giu,
  /\bhemat\s*\d+/giu,
  /\b\d{1,3}\s?%\s*off\b/giu,
  /\bbeli\s*\d+\s*(?:gratis|dapat|dapet)\s*\d+/giu,
  /\bbuy\s*\d+\s*get\s*\d+/giu,
  /\bb\d+g\d+\b/giu,
  /\bbogo\b/giu,
];

/**
 * Returns the offer phrases found in `text` (lower case, unique), or [] when there are none or when the owner
 * filled a promo (`promoActive`). A non-empty result means the caption must be regenerated or replaced.
 */
export function findUnauthorizedOffers(text, { promoActive = false } = {}) {
  if (promoActive || typeof text !== 'string') return [];
  const found = new Set();
  for (const pattern of OFFER_PATTERNS) {
    for (const match of text.matchAll(pattern)) {
      found.add(match[0].toLowerCase().replace(/\s+/g, ' '));
    }
  }
  return [...found];
}
