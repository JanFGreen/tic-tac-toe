import { describe, expect, it } from 'vitest';
import { readNickname, rememberNickname, type NicknameStorage } from './nickname-storage';

function memoryStorage(): NicknameStorage {
  const items = new Map<string, string>();
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      items.set(key, value);
    },
  };
}

const throwingStorage: NicknameStorage = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('blocked');
  },
};

describe('nickname storage', () => {
  it('remembers and reads a nickname', () => {
    const storage = memoryStorage();
    expect(readNickname(storage)).toBe('');
    rememberNickname(storage, 'Ann');
    expect(readNickname(storage)).toBe('Ann');
    expect(storage.getItem('tic-tac-toe.nickname')).toBe('Ann');
  });

  it('throwing or missing storage yields empty nickname without error', () => {
    expect(readNickname(throwingStorage)).toBe('');
    expect(() => {
      rememberNickname(throwingStorage, 'Ann');
    }).not.toThrow();
    expect(readNickname(null)).toBe('');
    expect(() => {
      rememberNickname(null, 'Ann');
    }).not.toThrow();
  });
});
