import type { MastodonStatus, TreeNode } from './types.js';

/**
 * Rebuild the tree from the flat `descendants[]` returned by /context.
 * Each status references its parent via `in_reply_to_id`. Orphans
 * (parent absent from the array) attach to the root.
 */
export function buildTree(
  rootId: string | number,
  descendants: readonly MastodonStatus[] | null | undefined,
): TreeNode {
  const list = descendants ?? [];
  const byId = new Map<string, TreeNode>();
  for (const s of list) {
    byId.set(String(s.id), { status: s, replies: [] });
  }
  const root: TreeNode = { status: null, replies: [] };
  const rootIdStr = String(rootId);
  for (const s of list) {
    const node = byId.get(String(s.id))!;
    const parentId = s.in_reply_to_id != null ? String(s.in_reply_to_id) : null;
    const parent =
      parentId && parentId !== rootIdStr && byId.has(parentId)
        ? byId.get(parentId)!
        : root;
    parent.replies.push(node);
  }
  return root;
}
