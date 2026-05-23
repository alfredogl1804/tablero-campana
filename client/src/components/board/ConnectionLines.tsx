/**
 * ConnectionLines — líneas curvas entre nodos
 * Por defecto invisibles. Visibles solo cuando un nodo está seleccionado o hovered.
 * Las líneas son arcos en parábola — sensación de cables de fibra óptica forjados.
 */
import { useMemo } from "react";
import * as THREE from "three";
import type { BoardNode } from "@/lib/board-types";

interface ConnectionLinesProps {
  nodes: BoardNode[];
  nodeMap: Map<string, BoardNode>;
  gridToWorld: (gx: number, gy: number) => [number, number, number];
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
}

function buildArc(
  from: THREE.Vector3,
  to: THREE.Vector3,
  segments = 30
): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
  const dist = from.distanceTo(to);
  const arcHeight = Math.min(dist * 0.35, 4);
  mid.y += arcHeight;

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    // Curva cuadrática Bézier
    const p = new THREE.Vector3();
    p.x = (1 - t) * (1 - t) * from.x + 2 * (1 - t) * t * mid.x + t * t * to.x;
    p.y = (1 - t) * (1 - t) * from.y + 2 * (1 - t) * t * mid.y + t * t * to.y;
    p.z = (1 - t) * (1 - t) * from.z + 2 * (1 - t) * t * mid.z + t * t * to.z;
    points.push(p);
  }
  return points;
}

export function ConnectionLines({
  nodes,
  nodeMap,
  gridToWorld,
  selectedNodeId,
  hoveredNodeId,
}: ConnectionLinesProps) {
  const focusedId = selectedNodeId ?? hoveredNodeId;

  const arcs = useMemo(() => {
    if (!focusedId) return [];
    const focused = nodeMap.get(focusedId);
    if (!focused) return [];

    const result: { points: THREE.Vector3[]; direction: "out" | "in" }[] = [];

    // Salidas
    focused.connections_out.forEach((targetId) => {
      const target = nodeMap.get(targetId);
      if (!target) return;
      const fromXYZ = gridToWorld(focused.grid_position[0], focused.grid_position[1]);
      const toXYZ = gridToWorld(target.grid_position[0], target.grid_position[1]);
      const from = new THREE.Vector3(fromXYZ[0], 0.5, fromXYZ[2]);
      const to = new THREE.Vector3(toXYZ[0], 0.5, toXYZ[2]);
      result.push({ points: buildArc(from, to), direction: "out" });
    });

    // Entradas
    focused.connections_in.forEach((sourceId) => {
      const source = nodeMap.get(sourceId);
      if (!source) return;
      const fromXYZ = gridToWorld(source.grid_position[0], source.grid_position[1]);
      const toXYZ = gridToWorld(focused.grid_position[0], focused.grid_position[1]);
      const from = new THREE.Vector3(fromXYZ[0], 0.5, fromXYZ[2]);
      const to = new THREE.Vector3(toXYZ[0], 0.5, toXYZ[2]);
      result.push({ points: buildArc(from, to), direction: "in" });
    });

    return result;
  }, [focusedId, nodeMap, gridToWorld]);

  if (arcs.length === 0) return null;

  return (
    <group>
      {arcs.map((arc, i) => {
        const geometry = new THREE.BufferGeometry().setFromPoints(arc.points);
        const color = arc.direction === "out" ? "#F97316" : "#3B82F6";
        return (
          <primitive
            key={i}
            object={
              new THREE.Line(
                geometry,
                new THREE.LineBasicMaterial({
                  color,
                  transparent: true,
                  opacity: 0.85,
                  linewidth: 2,
                  toneMapped: false,
                })
              )
            }
          />
        );
      })}
    </group>
  );
}
