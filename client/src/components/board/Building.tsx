"use no memo";
/**
 * Building — cada nodo del genoma como un prisma 3D
 * - Altura proporcional a LOC (escala log)
 * - Material según estado: ACTIVE, DEGRADED, SPRINT, FUTURE
 * - Forja: bordes biselados, brillo emisivo cálido
 */
import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import type { BoardNode } from "@/lib/board-types";

interface BuildingProps {
  node: BoardNode;
  position: [number, number, number];
  tileSize: number;
  districtColor: string;
  isSelected: boolean;
  isHovered: boolean;
  isDimmed: boolean;
  onClick: () => void;
  onPointerOver: () => void;
  onPointerOut: () => void;
  /** T3 Sprint v3.0 — label aplicada al tono actual (Modo Papá vs técnico). */
  displayLabel?: string;
}

// Escala log para que un nodo de 50 LOC y otro de 2000 LOC sean diferenciables
function locToHeight(loc: number): number {
  if (loc <= 0) return 0.4; // futuro
  return 0.4 + Math.log10(loc + 1) * 0.55;
}

export function Building({
  node,
  position,
  tileSize,
  districtColor,
  isSelected,
  isHovered,
  isDimmed,
  onClick,
  onPointerOver,
  onPointerOut,
  displayLabel,
}: BuildingProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);

  const height = useMemo(() => locToHeight(node.loc), [node.loc]);
  const width = tileSize * 0.65;

  // Material por estado
  const { color, emissive, emissiveIntensity, opacity, isWireframe, isPulsing } =
    useMemo(() => {
      switch (node.status) {
        case "ACTIVE":
          return {
            color: new THREE.Color(districtColor).lerp(new THREE.Color("#fff"), 0.1),
            emissive: new THREE.Color("#F97316"),
            emissiveIntensity: 0.4,
            opacity: 1,
            isWireframe: false,
            isPulsing: false,
          };
        case "DEGRADED":
          return {
            color: new THREE.Color("#92400e"),
            emissive: new THREE.Color("#dc2626"),
            emissiveIntensity: 0.5,
            opacity: 1,
            isWireframe: false,
            isPulsing: true,
          };
        case "SPRINT":
          return {
            color: new THREE.Color(districtColor),
            emissive: new THREE.Color("#F97316"),
            emissiveIntensity: 0.8,
            opacity: 0.55,
            isWireframe: true,
            isPulsing: true,
          };
        case "FUTURE":
          return {
            color: new THREE.Color("#3a3530"),
            emissive: new THREE.Color("#1c1917"),
            emissiveIntensity: 0.05,
            opacity: 0.25,
            isWireframe: true,
            isPulsing: false,
          };
      }
    }, [node.status, districtColor]);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;

    // Respiración sutil para activos
    if (node.status === "ACTIVE") {
      const breathe = 1 + Math.sin(t * 1.2 + position[0]) * 0.012;
      groupRef.current.scale.setScalar(breathe);
    }

    // Pulso para degraded/sprint
    if (isPulsing && glowRef.current) {
      const pulse = 0.5 + Math.sin(t * 2.5) * 0.5;
      const mat = glowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.15 + pulse * 0.25;
    }

    // Hover/select levitación
    if (isSelected || isHovered) {
      const lift = isSelected ? 0.4 : 0.2;
      groupRef.current.position.y +=
        (lift - groupRef.current.position.y) * 0.15;
    } else {
      groupRef.current.position.y += (0 - groupRef.current.position.y) * 0.15;
    }
  });

  const dimOpacity = isDimmed && !isHovered ? 0.35 : 1;

  return (
    <group
      ref={groupRef}
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        onPointerOver();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        onPointerOut();
        document.body.style.cursor = "auto";
      }}
    >
      {/* Glow base bajo el edificio */}
      {(node.status === "ACTIVE" || node.status === "SPRINT") && (
        <mesh
          ref={glowRef}
          position={[0, 0.01, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <circleGeometry args={[width * 0.9, 32]} />
          <meshBasicMaterial
            color={node.status === "ACTIVE" ? "#F97316" : "#FFA500"}
            transparent
            opacity={0.2}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Edificio principal — prisma */}
      <mesh
        ref={meshRef}
        position={[0, height / 2, 0]}
      >
        <boxGeometry args={[width, height, width]} />
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity * dimOpacity}
          roughness={node.status === "FUTURE" ? 0.95 : 0.45}
          metalness={node.status === "FUTURE" ? 0.1 : 0.6}
          transparent={opacity < 1}
          opacity={opacity * dimOpacity}
          wireframe={isWireframe}
        />
      </mesh>

      {/* Tapa superior cálida (chimenea de luz) para activos */}
      {node.status === "ACTIVE" && (
        <mesh position={[0, height + 0.02, 0]}>
          <boxGeometry args={[width * 0.5, 0.04, width * 0.5]} />
          <meshStandardMaterial
            color="#F97316"
            emissive="#F97316"
            emissiveIntensity={1.5}
            toneMapped={false}
          />
        </mesh>
      )}

      {/* Anillo de selección */}
      {isSelected && (
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[width * 0.95, width * 1.1, 48]} />
          <meshBasicMaterial color="#F97316" toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Label del nodo (solo si seleccionado o hover, para no saturar) */}
      {(isSelected || isHovered) && (
        <Text
          position={[0, height + 0.6, 0]}
          fontSize={0.32}
          color="#FFE4B5"
          anchorX="center"
          anchorY="middle"
          fillOpacity={1}
          outlineWidth={0.025}
          outlineColor="#0a0806"
        >
          {displayLabel ?? node.label}
        </Text>
      )}
    </group>
  );
}
