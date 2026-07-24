# Graph algorithms: shortest paths

## Choosing the meaning of “shortest”

A graph consists of vertices connected by edges, but a shortest path problem is not fully specified until the edge costs and direction are known. In an unweighted graph, path length means the number of edges. In a weighted road graph, it might mean distance, travel time, or toll cost. A route with fewer edges need not have the smallest total weight.

Breadth-first search finds shortest path lengths in an unweighted graph because it explores vertices in nondecreasing number of edges from the source. A queue maintains this frontier order. When a vertex is first discovered, every path with fewer edges has already had an opportunity to reach it, so its recorded level is optimal. Depth-first search does not preserve that guarantee because it may follow one long branch before inspecting a short alternative.

Running breadth-first search from one source produces a shortest-path tree for reachable vertices. The tree is not necessarily unique: two parents can offer paths with the same number of edges. The distance labels are still well defined even when predecessor choices depend on adjacency order.

## Weighted edges and greedy choices

Dijkstra's algorithm requires nonnegative edge weights. A reachable negative-weight edge can invalidate the greedy choice, while Bellman-Ford can accommodate negative edges and detect a reachable negative cycle.

The controlled exact-match identifier for the relaxation invariant is `RELAX_EDGE_UV`. Relaxing an edge from u to v asks whether the known distance to u plus the edge weight improves the known distance to v. If it does, both the distance and predecessor are updated. Repeating this small operation under different scheduling rules yields several shortest-path algorithms.

The update can be stated compactly as

$$
d[v] \leftarrow \min\!\bigl(d[v],\ d[u] + w(u,v)\bigr).
$$

When the second term is smaller, the predecessor may be set to \(\pi[v] \leftarrow u\). The expression is local, but correctness depends on the order and number of times edges are relaxed. Applying it once to every edge in an arbitrary cyclic graph is not sufficient.

Dijkstra selects the unsettled vertex with the smallest tentative distance. Nonnegative edges ensure that no later route through a more distant unsettled vertex can reduce that settled value. A priority queue improves efficiency on sparse graphs, but it does not repair the correctness problem created by negative weights.

Bellman-Ford repeatedly considers all edges. After enough passes, every simple shortest path has propagated through its edges. One additional improving pass indicates a reachable negative cycle. In that case some path costs have no finite minimum because traversing the cycle again makes the total smaller.

## Other structures

For a directed acyclic graph, topological order permits shortest paths even with negative weights because no cycle can revisit an earlier dependency. All-pairs problems may instead use Floyd-Warshall or repeated single-source searches. The correct method depends on graph density, weight constraints, whether all sources are needed, and whether the graph changes between queries.
