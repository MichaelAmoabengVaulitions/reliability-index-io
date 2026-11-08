import '@testing-library/jest-dom';
import { beforeEach, vi } from 'vitest';

import { fakeBackend } from './fakeBackend';

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(fakeBackend));
});
