import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTree } from '../src/threading.js';
import type { MastodonStatus } from '../src/types.js';

const s = (id: string | number, parent: string | number | null): MastodonStatus =>
  ({
    id: String(id),
    in_reply_to_id: parent == null ? null : String(parent),
  }) as MastodonStatus;

test('buildTree: empty descendants', () => {
  const tree = buildTree('1', []);
  assert.deepEqual(tree.replies, []);
});

test('buildTree: null/undefined descendants', () => {
  assert.deepEqual(buildTree('1', null).replies, []);
  assert.deepEqual(buildTree('1', undefined).replies, []);
});

test('buildTree: single root-level reply', () => {
  const tree = buildTree('1', [s('a', '1')]);
  assert.equal(tree.replies.length, 1);
  assert.equal(tree.replies[0]!.status!.id, 'a');
  assert.deepEqual(tree.replies[0]!.replies, []);
});

test('buildTree: two root-level replies', () => {
  const tree = buildTree('1', [s('a', '1'), s('b', '1')]);
  assert.equal(tree.replies.length, 2);
  assert.equal(tree.replies[0]!.status!.id, 'a');
  assert.equal(tree.replies[1]!.status!.id, 'b');
});

test('buildTree: nested reply', () => {
  const tree = buildTree('1', [s('a', '1'), s('b', 'a')]);
  assert.equal(tree.replies.length, 1);
  assert.equal(tree.replies[0]!.status!.id, 'a');
  assert.equal(tree.replies[0]!.replies.length, 1);
  assert.equal(tree.replies[0]!.replies[0]!.status!.id, 'b');
});

test('buildTree: deep tree (3 levels)', () => {
  const tree = buildTree('1', [s('a', '1'), s('b', 'a'), s('c', 'b')]);
  assert.equal(tree.replies[0]!.status!.id, 'a');
  assert.equal(tree.replies[0]!.replies[0]!.status!.id, 'b');
  assert.equal(tree.replies[0]!.replies[0]!.replies[0]!.status!.id, 'c');
});

test('buildTree: orphan (missing parent) is attached to the root', () => {
  const tree = buildTree('1', [s('a', '1'), s('b', 'z')]);
  assert.equal(tree.replies.length, 2);
  const ids = tree.replies.map((n) => n.status!.id).sort();
  assert.deepEqual(ids, ['a', 'b']);
});

test('buildTree: null in_reply_to_id treated as root', () => {
  const tree = buildTree('1', [s('a', null)]);
  assert.equal(tree.replies.length, 1);
  assert.equal(tree.replies[0]!.status!.id, 'a');
});

test('buildTree: numeric and string IDs interchangeable', () => {
  const tree = buildTree(1, [
    { id: '2', in_reply_to_id: '1' } as MastodonStatus,
    { id: '3', in_reply_to_id: '2' } as MastodonStatus,
  ]);
  assert.equal(tree.replies.length, 1);
  assert.equal(tree.replies[0]!.status!.id, '2');
  assert.equal(tree.replies[0]!.replies[0]!.status!.id, '3');
});
