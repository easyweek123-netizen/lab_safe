import '@testing-library/jest-dom/vitest';
import { Blob as NodeBlob, File as NodeFile } from 'node:buffer';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './msw';

// jsdom's FormData, File and Blob can't be sent by Node's fetch: a file arrives as the text
// "[object File]" or the request fails. The tests use Node's own classes, as a browser would use
// its own, so a multipart upload (S03.1 photos) reaches MSW as real multipart bytes.
const NodeFormData = (await new Response(new URLSearchParams('probe=1')).formData())
  .constructor as typeof FormData;
Object.assign(globalThis, { FormData: NodeFormData, File: NodeFile, Blob: NodeBlob });

// Every request goes to the MSW handlers of src/test/msw.ts; an unhandled request fails the test.
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});
