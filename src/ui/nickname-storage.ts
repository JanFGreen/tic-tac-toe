export type NicknameStorage = Pick<Storage, 'getItem' | 'setItem'>;

const nicknameKey = 'tic-tac-toe.nickname';

/** The device storage, or null when the browser does not offer it. */
export function browserStorage(): NicknameStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readNickname(storage: NicknameStorage | null): string {
  try {
    return storage?.getItem(nicknameKey) ?? '';
  } catch {
    return '';
  }
}

export function rememberNickname(storage: NicknameStorage | null, nickname: string): void {
  try {
    storage?.setItem(nicknameKey, nickname);
  } catch {
    // Remembering is a convenience; the save itself already succeeded.
  }
}
