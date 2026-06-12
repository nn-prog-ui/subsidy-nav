import { describe, it, expect, beforeEach } from 'vitest';
import { getToken, setToken, clearToken, authHeaders } from '../auth';

describe('認証ユーティリティ auth.ts', () => {
  beforeEach(() => localStorage.clear());

  it('トークンの保存・取得・削除', () => {
    expect(getToken()).toBeNull();
    setToken('abc123');
    expect(getToken()).toBe('abc123');
    clearToken();
    expect(getToken()).toBeNull();
  });

  it('authHeadersはトークン無しでContent-Typeのみ返す', () => {
    const h = authHeaders() as Record<string, string>;
    expect(h['Content-Type']).toBe('application/json');
    expect(h['Authorization']).toBeUndefined();
  });

  it('authHeadersはトークン有りでAuthorizationを付与する', () => {
    setToken('xyz');
    const h = authHeaders() as Record<string, string>;
    expect(h['Authorization']).toBe('Bearer xyz');
  });
});
