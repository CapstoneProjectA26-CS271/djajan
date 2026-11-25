import { describe, it, expect } from 'vitest';
import { checkNewPassword } from '../src/utils/password.js';

describe('checkNewPassword', () => {
  it('accepts 12 to 72 ASCII characters', () => {
    expect(checkNewPassword('a'.repeat(12))).toBeNull();
    expect(checkNewPassword('a'.repeat(72))).toBeNull();
  });

  it('rejects fewer than 12 characters', () => {
    expect(checkNewPassword('a'.repeat(11))).toBe('Password minimal 12 karakter');
  });

  it('rejects non-strings', () => {
    expect(checkNewPassword(undefined)).toBe('Password minimal 12 karakter');
    expect(checkNewPassword(123456789012)).toBe('Password minimal 12 karakter');
  });

  it('rejects more than 72 bytes, counting multibyte characters by bytes', () => {
    expect(checkNewPassword('a'.repeat(73))).toBe('Password maksimal 72 karakter');
    // 25 x "é" = 50 bytes passes; 37 x "é" = 74 bytes fails although it is only 37 characters.
    expect(checkNewPassword('é'.repeat(25))).toBeNull();
    expect(checkNewPassword('é'.repeat(37))).toBe('Password maksimal 72 karakter');
  });
});
