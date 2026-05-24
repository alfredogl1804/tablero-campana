"use no memo";
/**
 * EL MONSTRUO — Tablero de Campaña isométrico 3D
 * Diseño: "Forja Industrial Brutalista"
 * - Cámara ortográfica fija en isométrico (sin rotación libre)
 * - Grid por distritos, posiciones FIJAS (memoria espacial)
 * - Nodos prismáticos con altura proporcional a LOC (escala log)
 * - Estados visuales por material: ACTIVE / DEGRADED / SPRINT / FUTURE
 */
import { Canvas, useFrame } from "@react-three/fiber";
import { OrthographicCamera, Grid } from "@react-three/drei";
import { useMemo, useRef, useState, useCallback, useEffect } from "react";
import * as THREE from "three";
import type { BoardData, BoardNode, BoardDistrict } from "@/lib/board-types";
import { DistrictPlatform } from "./DistrictPlatform";
import { Building } from "./Building";
import { ConnectionLines } from "./ConnectionLines";

interface IsometricBoardProps {
  data: BoardData;
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  onSelectNode: (id: string | null) => void;
  onHoverNode: (id: string | null) => void;
  zoomLevel: number;
}

// Constantes de geometría del tablero
const TILE_SIZE = 2.2;
const BOARD_WIDTH = 13 * TILE_SIZE;
const BOARD_DEPTH = 12 * TILE_SIZE;

function CameraRig({ zoomLevel, focusPosition }: { zoomLevel: number; focusPosition: [number, number, number] | null }) {
  const cameraRef = useRef<THREE.OrthographicCamera>(null);
  const targetZoom = useRef(zoomLevel);
  const targetPos = useRef(new THREE.Vector3(0, 0, 0));

  useEffect(() => {
    targetZoom.current = zoomLevel;
  }, [zoomLevel]);

  useEffect(() => {
    if (focusPosition) {
      targetPos.current.set(focusPosition[0], 0, focusPosition[2]);
    }
  }, [focusPosition]);

  useFrame(() => {
    if (!cameraRef.current) return;
    // Suave lerp del zoom
    cameraRef.current.zoom += (targetZoom.current - cameraRef.current.zoom) * 0.08;
    cameraRef.current.updateProjectionMatrix();

    // Suave lerp del paneo
    cameraRef.current.position.x += (targetPos.current.x + 30 - cameraRef.current.position.x) * 0.06;
    cameraRef.current.position.z += (targetPos.current.z + 30 - cameraRef.current.position.z) * 0.06;
    cameraRef.current.lookAt(targetPos.current.x, 0, targetPos.current.z);
  });

  return (
    <OrthographicCamera
      ref={cameraRef}
      makeDefault
      position={[30, 30, 30]}
      zoom={zoomLevel}
      near={0.1}
      far={1000}
    />
  );
}

function ForjaLighting() {
  return (
    <>
      {/* Luz ambiente fría (taller en penumbra) */}
      <ambientLight intensity={0.25} color="#3a3530" />

      {/* Luz cálida principal — naranja forja desde el centro arriba */}
      <pointLight
        position={[0, 18, 0]}
        intensity={45}
        distance={50}
        decay={1.8}
        color="#F97316"
      />

      {/* Luz direccional clave (sol del taller) */}
      <directionalLight
        position={[15, 25, 15]}
        intensity={1.4}
        color="#FFE4B5"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.1}
        shadow-camera-far={80}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
      />

      {/* Rim light frío (acero) */}
      <directionalLight
        position={[-15, 10, -15]}
        intensity={0.4}
        color="#A0A8B0"
      />

      {/* Hemisphere para suavizar */}
      <hemisphereLight args={["#F97316", "#1C1917", 0.15]} />
    </>
  );
}

function BoardFloor() {
  return (
    <>
      {/* Mesa de trabajo principal (acero industrial) */}
      <mesh receiveShadow position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[BOARD_WIDTH + 4, BOARD_DEPTH + 4]} />
        <meshStandardMaterial
          color="#0e0c0a"
          roughness={0.95}
          metalness={0.3}
        />
      </mesh>

      {/* Grid sutil en el suelo */}
      <Grid
        position={[0, 0, 0]}
        args={[BOARD_WIDTH, BOARD_DEPTH]}
        cellSize={TILE_SIZE}
        cellThickness={0.4}
        cellColor="#3a2d20"
        sectionSize={TILE_SIZE * 4}
        sectionThickness={0.8}
        sectionColor="#5a3a1f"
        fadeDistance={50}
        fadeStrength={1.5}
        infiniteGrid={false}
      />

      {/* Borde biselado del tablero */}
      <mesh position={[0, -0.15, 0]}>
        <boxGeometry args={[BOARD_WIDTH + 1.5, 0.3, BOARD_DEPTH + 1.5]} />
        <meshStandardMaterial
          color="#2a2520"
          roughness={0.6}
          metalness={0.7}
        />
      </mesh>
    </>
  );
}

export function IsometricBoard({
  data,
  selectedNodeId,
  hoveredNodeId,
  onSelectNode,
  onHoverNode,
  zoomLevel,
}: IsometricBoardProps) {
  // Convierte grid_position a coordenadas mundo
  const gridToWorld = useCallback(
    (gx: number, gy: number): [number, number, number] => {
      // Centra el tablero en el origen
      const x = (gx - 6) * TILE_SIZE;
      const z = (gy - 5.5) * TILE_SIZE;
      return [x, 0, z];
    },
    []
  );

  // Mapa de nodos por id para conexiones
  const nodeMap = useMemo(() => {
    const m = new Map<string, BoardNode>();
    data.nodes.forEach((n) => m.set(n.id, n));
    return m;
  }, [data.nodes]);

  // Centro de cada distrito para etiquetas
  const districtCenters = useMemo(() => {
    return data.districts.map((d) => {
      const cx = d.grid_origin[0] + d.grid_size[0] / 2 - 0.5;
      const cy = d.grid_origin[1] + d.grid_size[1] / 2 - 0.5;
      return {
        district: d,
        worldPos: gridToWorld(cx, cy),
      };
    });
  }, [data.districts, gridToWorld]);

  const focusPosition = useMemo<[number, number, number] | null>(() => {
    if (!selectedNodeId) return null;
    const n = nodeMap.get(selectedNodeId);
    if (!n) return null;
    return gridToWorld(n.grid_position[0], n.grid_position[1]);
  }, [selectedNodeId, nodeMap, gridToWorld]);

  return (
    <Canvas
      shadows={false}
      dpr={[1, 1.5]}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: "default",
        // Retiene el frame para que el screenshot del sandbox/headless lo capture.
        // Sin esto, WebGL limpia el drawing buffer después del swap y el screenshot
        // sólo atrapa el clear color por defecto (negro). Validado empíricamente v2.3.
        preserveDrawingBuffer: true,
        failIfMajorPerformanceCaveat: false,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.0,
      }}
      style={{ background: "transparent", width: "100%", height: "100%" }}
      onCreated={(state) => {
        // Red de seguridad: si en el futuro el GPU pierde contexto en algún dispositivo,
        // dejamos rastro para diagnóstico (ver postmortem v2.4 — Google Fonts suspender).
        const canvas = state.gl.domElement;
        canvas.addEventListener("webglcontextlost", (event) => {
          event.preventDefault();
          console.error("[IsometricBoard] WebGL context LOST — GPU detached the renderer");
        });
        canvas.addEventListener("webglcontextrestored", () => {
          console.log("[IsometricBoard] WebGL context restored");
        });
      }}
    >
      <color attach="background" args={["#16110d"]} />
      <fog attach="fog" args={["#16110d", 30, 90]} />

      <CameraRig zoomLevel={zoomLevel} focusPosition={focusPosition} />
      <ForjaLighting />
      <BoardFloor />

      {/* Plataformas de cada distrito */}
      {data.districts.map((d) => (
        <DistrictPlatform
          key={d.id}
          district={d}
          gridToWorld={gridToWorld}
          tileSize={TILE_SIZE}
        />
      ))}

      {/* Edificios (nodos) */}
      {data.nodes.map((node) => {
        const district = data.districts.find((d) => d.id === node.district);
        const pos = gridToWorld(node.grid_position[0], node.grid_position[1]);
        return (
          <Building
            key={node.id}
            node={node}
            position={pos}
            tileSize={TILE_SIZE}
            districtColor={district?.color ?? "#F97316"}
            isSelected={selectedNodeId === node.id}
            isHovered={hoveredNodeId === node.id}
            isDimmed={
              selectedNodeId !== null && selectedNodeId !== node.id
            }
            onClick={() => onSelectNode(node.id === selectedNodeId ? null : node.id)}
            onPointerOver={() => onHoverNode(node.id)}
            onPointerOut={() => onHoverNode(null)}
          />
        );
      })}

      {/* Líneas de conexión */}
      <ConnectionLines
        nodes={data.nodes}
        nodeMap={nodeMap}
        gridToWorld={gridToWorld}
        selectedNodeId={selectedNodeId}
        hoveredNodeId={hoveredNodeId}
      />

      {/* Click vacío para deseleccionar */}
      <mesh
        position={[0, -0.5, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={() => onSelectNode(null)}
      >
        <planeGeometry args={[200, 200]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/*
        <Environment preset="warehouse" /> intentaba cargar un HDRI desde
        threejs.org (CDN externa). En este sandbox la CDN está bloqueada,
        así que el componente quedaba suspendido para siempre y todo el
        Canvas se congelaba (sin render loop, sin frames, sin meshes).
        Causa raíz validada con probe de GPT-5.5 Pro (Sabio #1) v2.4.
        Las luces de ForjaLighting bastan para iluminar la escena sin HDRI.
      */}
    </Canvas>
  );
}
