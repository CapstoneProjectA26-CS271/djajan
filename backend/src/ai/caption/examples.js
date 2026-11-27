// Brand voice material for the caption prompt. Source: "DJAJAN x ASAH.pdf" (contoh caption) and the
// owner's past Instagram/Threads captions. Prices, locations, dates, and stock counts were removed on
// purpose: the model copies whatever is in the examples, and the validator rejects invented numbers.

export const OWNER_EXAMPLES = [
  {
    style: 'promo',
    text: 'Keju lagi, keju lagi, emang kenapa? 😋🧀\nKalau udah creamy, cheesy, dan bikin nagih, siapa yang bisa nolak?\nYuk, DJAJAN hari ini!',
  },
  {
    style: 'promo',
    text: 'Lagi pengen makan enak tapi nggak mau bikin dompet nangis? 👀\nDJAJAN jawabannya! Creamy, gurih, dan pastinya bikin happy. 💛',
  },
  {
    style: 'cerita',
    text: 'Mac n cheese dengan ngejunya ngeju creamy polll, dijamin sendok pengen meluncur terus ke muluttt 😋😋\nAda yang belum nyoba sesendok? 🤔',
  },
  {
    style: 'fomo',
    text: 'Mac n Cheese yang cheesenya ngecheese banget, udah berangkatttt. Yang belom, nunggu apa? Gajian ya? 🕺🏻\nNjajanlah sebelum njajan itu dilarang 🤫',
  },
  {
    style: 'cerita',
    text: 'GAJIAN CAIR JALAN-JALAN ❌\nGAJIAN CAIR JAJAN-JAJAN ✅\nTeam cheesy atau team pedas nih? 🌶🧀 Kalau di DJAJAN, dua-duanya bikin mood makan jadi happy!',
  },
];

// Signature phrases from the owner's captions.
export const BRAND_PHRASES = [
  'Admin menyebut dirinya "Mijan".',
  'Sapaan pembeli: "Konco Njajan", "Djajaners", atau "Kang Njajan".',
  'Tagline: "Njajanlah sebelum njajan itu dilarang".',
  'Suka plesetan tebak-tebakan, contoh: "Mangga, mangga apa yang bikin semua senang? MANGGAjak teman-teman beli…".',
  'Huruf kapital dan emoji untuk kesan heboh, vokal dipanjangkan ("polll", "enakkk", "CIIINNN").',
];

// Suroboyoan vocabulary. Used sparingly so the caption stays readable for non-Javanese speakers.
export const SUROBOYO_WORDS = [
  'rek', 'lur', 'arek-arek', 'mbois', 'pol / puol', 'cangkruk', 'wani', 'ae', 'koen', 'suuuiippp',
  'uenak', 'sueger', 'gak rewel', 'santuy', 'lapo', 'gak cangs ta?', 'loss',
];
