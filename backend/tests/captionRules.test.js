import { describe, it, expect } from 'vitest';
import { CAPTION_STYLES, findUnauthorizedOffers } from '../src/services/ai/captionRules.js';

describe('CAPTION_STYLES', () => {
  it('follows the owner categories', () => {
    expect(CAPTION_STYLES).toEqual(['promo', 'soft_selling', 'interaksi']);
  });
});

describe('findUnauthorizedOffers', () => {
  it.each([
    ['gratis', 'Ada yang gratis? Ada dong! 👀', ['gratis']],
    ['gratisan', 'Siapa mau gratisan hari ini?', ['gratisan']],
    ['free', 'Free ongkir se-Surabaya!', ['free']],
    ['diskon with percent', 'DISKON 50% khusus hari ini 🔥', ['diskon']],
    ['disc', 'Disc 20% buat kamu', ['disc']],
    ['promo word', 'Saatnya nikmatin promo spesial dari DJAJAN ✨', ['promo']],
    ['promo with percent', 'promo 30% sampai Minggu', ['promo']],
    ['percent off', 'Classic Mac 25% off!', ['25% off']],
    ['potongan harga', 'Ada potongan harga buat pelajar', ['potongan harga']],
    ['cashback', 'Cashback 10rb pakai e-wallet', ['cashback']],
    ['voucher', 'Pakai voucher DJAJAN10', ['voucher']],
    ['bonus', 'Bonus topping keju!', ['bonus']],
    ['flash sale', 'Flash sale jam 12!', ['flash sale']],
    ['harga spesial', 'Harga spesial akhir pekan', ['harga spesial']],
    ['hemat', 'Hemat 5rb tiap porsi', ['hemat 5']],
    ['beli 1 gratis 1', 'Beli 1 gratis 1 khusus Jumat', ['gratis', 'beli 1 gratis 1']],
    ['beli 2 dapat 3', 'beli 2 dapat 3, gas!', ['beli 2 dapat 3']],
    ['buy 1 get 1', 'Buy 1 Get 1 all variant', ['buy 1 get 1']],
    ['b1g1', 'B1G1 sampai stok habis', ['b1g1']],
  ])('flags %s', (_case, text, expected) => {
    expect(findUnauthorizedOffers(text).sort()).toEqual([...expected].sort());
  });

  it.each([
    ['soft selling', 'Lagi pengen makan enak tanpa bikin dompet nangis? 👀 Royale Mac Rp15.000, creamy dan gurih 💛'],
    ['interaction', 'Tim cheesy atau tim pedas? 🌶🧀 Dua-duanya bikin mood makan naik!'],
    ['food word "potongan"', 'Signature Mac pakai potongan chicken yang juicy'],
    ['percent that is not an offer', '100% keju creamy, dijamin nagih'],
    ['word that only contains an offer term', 'Freedom rasa keju, cuma di DJAJAN'],
  ])('allows a clean caption: %s', (_case, text) => {
    expect(findUnauthorizedOffers(text)).toEqual([]);
  });

  it('allows offer wording when the owner filled a promo', () => {
    expect(findUnauthorizedOffers('Diskon 20%, jadi Rp20.000 aja!', { promoActive: true })).toEqual([]);
  });

  it('reports each phrase once', () => {
    expect(findUnauthorizedOffers('Gratis! Gratis! GRATIS!')).toEqual(['gratis']);
  });

  it('returns [] for non-text input', () => {
    expect(findUnauthorizedOffers(undefined)).toEqual([]);
  });
});
