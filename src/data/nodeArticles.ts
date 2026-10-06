import { site } from "@/config/site";
import type { NodeId } from "./nodes";

/**
 * Capability → blog article URLs (outbound links only).
 * TODO: pair each node with 1–2 blog articles. Until then, links fall back to the blog home.
 */
export const NODE_ARTICLES: Record<NodeId, string[]> = {
  N1: [], N2: [], N3: [], N4: [], N5: [], N6: [], N7: [], N8: [], N9: [],
  N10: [], N11: [], N12: [], N13: [], N14: [], N15: [], N16: [], N17: [],
};

export function articlesFor(node: NodeId): string[] {
  const list = NODE_ARTICLES[node];
  return list.length > 0 ? list : [site.blogUrl];
}
