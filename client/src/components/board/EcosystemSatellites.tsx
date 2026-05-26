"use no memo";
/**
 * EcosystemSatellites — Hito B-polish v1.1
 *
 * Visualiza los proyectos del ecosistema como satélites orbitando alrededor
 * del tablero, fuera del perímetro principal para no chocar con edificios
 * existentes. Cada satélite es un prisma pequeño con material según status:
 *   active   → cobre brillante
 *   dormant  → acero opaco
 *   archived → granito frío
 *   embryo   → cristal violeta translúcido
 *
 * Datos: trpc.ecosystem.list (refetch 5min). Posición: anillo orbital
 * estable (semilla = id). Animación: rotación lenta del anillo + leve bob.
 */
import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { trpc } from "@/lib/trpc";

const ORBIT_RADIUS = 19; // un poco fuera de BOARD_WIDTH/2
const SATELLITE_HEIGHT = 0.5;
const SATELLITE_SIZE = 0.55;

type Status = "active" | "dormant" | "archived" | "embryo" | "unknown";

const MATERIAL_BY_STATUS: Record<
  Status,
  { color: string; emissive: string; emissiveIntensity: number; metalness: number; roughness: number }
> = {
  active: {
    color: "#d97706",
    emissive: "#f97316",
    emissiveIntensity: 0.55,
    metalness: 0.65,
    roughness: 0.35,
  },
  dormant: {
    color: "#52525b",
    emissive: "#27272a",
    emissiveIntensity: 0.05,
    metalness: 0.85,
    roughness: 0.6,
  },
  archived: {
    color: "#3f3f46",
    emissive: "#000000",
    emissiveIntensity: 0,
    metalness: 0.5,
    roughness: 0.95,
  },
  embryo: {
    color: "#7c3aed",
    emissive: "#a855f7",
    emissiveIntensity: 0.4,
    metalness: 0.2,
    roughness: 0.4,
  },
  unknown: {
    color: "#1c1917",
    emissive: "#000000",
    emissiveIntensity: 0,
    metalness: 0.4,
    roughness: 0.9,
  },
};

function hashIdToAngle(slug: string, total: number, index: number): number {
  // Distribución estable: el índice del proyecto en el array determina su
  // ángulo base, con un pequeño jitter determinista del slug para que dos
  // proyectos en posiciones consecutivas no parezcan duplicados perfectos.
  let h = 0;
  for (let i = 0; i < slug.length; i++) {
    h = (h * 31 + slug.charCodeAt(i)) | 0;
  }
  const jitter = ((h % 1000) / 1000) * 0.15; // ±0.075 rad ~ 4°
  const baseAngle = (index / total) * Math.PI * 2;
  return baseAngle + jitter - 0.075;
}

export function EcosystemSatellites() {
  const groupRef = useRef<THREE.Group>(null);
  const projects = trpc.ecosystem.list.useQuery(undefined, {
    refetchInterval: 5 * 60_000,
    staleTime: 60_000,
  });

  const placedSatellites = useMemo(() => {
    const data = projects.data ?? [];
    return data.map((p, i) => {
      const angle = hashIdToAngle(p.projectId, data.length || 1, i);
      const x = Math.cos(angle) * ORBIT_RADIUS;
      const z = Math.sin(angle) * ORBIT_RADIUS;
      const status = (p.status as Status) ?? "unknown";
      return { p, angle, x, z, status };
    });
  }, [projects.data]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    // rotación lenta global del anillo
    groupRef.current.rotation.y = clock.getElapsedTime() * 0.03;
  });

  if (placedSatellites.length === 0) return null;

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {placedSatellites.map(({ p, x, z, status }) => {
        const m = MATERIAL_BY_STATUS[status] ?? MATERIAL_BY_STATUS.unknown;
        return (
          <mesh
            key={p.projectId}
            position={[x, SATELLITE_HEIGHT, z]}
            castShadow
          >
            <octahedronGeometry args={[SATELLITE_SIZE, 0]} />
            <meshStandardMaterial
              color={m.color}
              emissive={m.emissive}
              emissiveIntensity={m.emissiveIntensity}
              metalness={m.metalness}
              roughness={m.roughness}
            />
          </mesh>
        );
      })}
    </group>
  );
}
