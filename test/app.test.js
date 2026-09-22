// Run these with:  npm test
//
// They start the real server on a spare port and make real HTTP requests,
// so if these pass the app genuinely works.

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { server } from '../src/server.js';

let base;

before(async () => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

test('/healthz answers 200', async () => {
  const res = await fetch(`${base}/healthz`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { status: 'ok' });
});

test('the home page renders', async () => {
  const res = await fetch(`${base}/`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /text\/html/);
  assert.match(await res.text(), /It works/);
});

test('a note can be added and read back', async () => {
  const body = new URLSearchParams({ body: 'a note from the tests' });
  const post = await fetch(`${base}/notes`, { method: 'POST', body, redirect: 'manual' });
  assert.equal(post.status, 303);

  const notes = await (await fetch(`${base}/api/notes`)).json();
  assert.ok(notes.some((n) => n.body === 'a note from the tests'));
});

test('HTML in a note is escaped, not executed', async () => {
  const body = new URLSearchParams({ body: '<script>alert(1)</script>' });
  await fetch(`${base}/notes`, { method: 'POST', body, redirect: 'manual' });

  const page = await (await fetch(`${base}/`)).text();
  assert.ok(!page.includes('<script>alert(1)</script>'), 'raw script tag leaked into the page');
  assert.ok(page.includes('&lt;script&gt;'), 'expected the tag to be escaped');
});

test('an empty note is rejected', async () => {
  const before = (await (await fetch(`${base}/api/notes`)).json()).length;
  await fetch(`${base}/notes`, {
    method: 'POST',
    body: new URLSearchParams({ body: '   ' }),
    redirect: 'manual',
  });
  const after = (await (await fetch(`${base}/api/notes`)).json()).length;
  assert.equal(after, before, 'a blank note was stored');
});

test('an oversized body gets 413, not a dropped connection', async () => {
  const res = await fetch(`${base}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'body=' + 'A'.repeat(40_000),
    redirect: 'manual',
  });
  assert.equal(res.status, 413);
});

test('an unknown path gets 404', async () => {
  assert.equal((await fetch(`${base}/no-such-page`)).status, 404);
});

test('status reports no database when DATABASE_URL is unset', async () => {
  const status = await (await fetch(`${base}/api/status`)).json();
  assert.equal(status.app, 'ok');
  assert.equal(status.database.configured, false);
});
