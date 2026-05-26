"use no memo";
/**
 * EventParticles — Hito B-polish v1.1
 *
 * Cuando llegan eventos firmados al observatorio (bus ed25519), por cada uno
 * lanzamos un punto de luz desde el centro del tablero hacia un destino
 * aleatorio en el perímetro. Vida: 2.4s. Tamaño chico, no agresivo.
 * Color por verificación: verde si signature_valid, rojo si no.
 *
 * Lectura: trpc.observatorio.recent (poll cada 3s). Solo procesamos eventos
 * cuyo timestamp es posterior al último que vimos.
 */
import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { trpc } from "@/lib/trpc";

interface FlyingEvent {
  id: string;
  start: number;
  fromX: number;
  fromZ: number;
  toX: number;
  toZ: number;
  valid: boolean;
}

const PARTICLE_LIFE_MS = 2400;
const SPAWN_HEIGHT = 4;

export function EventParticles() {
  const [active, setActive] = useState<FlyingEvent[]>([]);
  const lastSeenAtRef = useRef<number>(0);
  const meshRefs = useRef<Map<string, THREE.Mesh | null>>(new Map());

  // observatorio.recent es la fuente del observatorio firmado (Hito A)
  const recent = trpc.observatorio.getRecent.useQuery(
    { limit: 20, onlyVerified: false },
    {
      refetchInterval: 3_000,
      staleTime: 1_000,
    },
  );

  useEffect(() => {
    if (!recent.data) return;
    const newOnes: FlyingEvent[] = [];
    for (const ev of recent.data) {
      const t = new Date(ev.emitted_at).getTime();
      if (Number.isNaN(t) || t <= lastSeenAtRef.current) continue;
      const angle = Math.random() * Math.PI * 2;
      const radius = 11 + Math.random() * 6;
      newOnes.push({
        id: ev.event_id,
        start: performance.now(),
        fromX: 0,
        fromZ: 0,
        toX: Math.cos(angle) * radius,
        toZ: Math.sin(angle) * radius,
        valid: ev.verified,
      });
      if (t > lastSeenAtRef.current) lastSeenAtRef.current = t;
    }
    if (newOnes.length === 0) return;
    setActive((prev) => [...prev, ...newOnes].slice(-30));
  }, [recent.data]);

  useFrame(() => {
    const now = performance.now();
    let dirty = false;
    for (const ev of active) {
      const age = now - ev.start;
      const t = Math.min(age / PARTICLE_LIFE_MS, 1);
      const mesh = meshRefs.current.get(ev.id);
      if (!mesh) continue;
      // arc parabólico — se eleva y desciende en SPAWN_HEIGHT
      const x = ev.fromX + (ev.toX - ev.fromX) * t;
      const z = ev.fromZ + (ev.toZ - ev.fromZ) * t;
      const y = SPAWN_HEIGHT * (1 - Math.pow(2 * t - 1, 2)) + 0.4;
      mesh.position.set(x, y, z);
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = 1 - t;
      if (t >= 1) dirty = true;
    }
    if (dirty) {
      setActive((prev) => prev.filter((e) => now - e.start < PARTICLE_LIFE_MS));
    }
  });

  return (
    <group>
      {active.map((ev) => (
        <mesh
          key={ev.id}
          ref={(m) => {
            if (m) meshRefs.current.set(ev.id, m);
          }}
          position={[ev.fromX, SPAWN_HEIGHT, ev.fromZ]}
        >
          <sphereGeometry args={[0.16, 8, 8]} />
          <meshBasicMaterial
            color={ev.valid ? "#22c55e" : "#ef4444"}
            transparent
            opacity={1}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}
