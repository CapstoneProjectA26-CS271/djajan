import { describe, it, expect } from 'vitest';
import { detectImageType } from '../src/utils/imageType.js';

const pad = (bytes) => Buffer.concat([Buffer.from(bytes), Buffer.alloc(16)]);

describe('detectImageType', () => {
  it.each([
    ['JPEG', pad([0xff, 0xd8, 0xff, 0xdb]), { mime: 'image/jpeg', ext: 'jpg' }],
    ['PNG', pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), { mime: 'image/png', ext: 'png' }],
    [
      'WEBP',
      Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP'), Buffer.alloc(8)]),
      { mime: 'image/webp', ext: 'webp' },
    ],
  ])('recognizes %s', (_name, buffer, expected) => {
    expect(detectImageType(buffer)).toEqual(expected);
  });

  it.each([
    ['GIF', pad([0x47, 0x49, 0x46, 0x38, 0x39, 0x61])],
    ['SVG', pad([...Buffer.from('<svg xmlns="http://www.w3.org/2000/svg">')])],
    ['RIFF that is not WEBP (WAV)', Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WAVE'), Buffer.alloc(8)])],
    ['text', Buffer.from('bukan gambar sama sekali')],
    ['too short', Buffer.from([0xff, 0xd8, 0xff])],
  ])('rejects %s', (_name, buffer) => {
    expect(detectImageType(buffer)).toBeNull();
  });

  it('rejects non-buffers', () => {
    expect(detectImageType('string')).toBeNull();
    expect(detectImageType(undefined)).toBeNull();
  });
});
