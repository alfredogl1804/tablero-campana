/**
 * Plataforma de distrito — la "parcela" donde viven los nodos
 * Forja Industrial: placa de acero con tinte del distrito + label flotante
 */
import { useMemo } from "react";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import type { BoardDistrict } from "@/lib/board-types";

interface DistrictPlatformProps {
  district: BoardDistrict;
  gridToWorld: (gx: number, gy: number) => [number, number, number];
  tileSize: number;
}

export function DistrictPlatform({
  district,
  gridToWorld,
  tileSize,
}: DistrictPlatformProps) {
  const [originX, , originZ] = gridToWorld(
    district.grid_origin[0],
    district.grid_origin[1]
  );
  const widthW = district.grid_size[0] * tileSize;
  const depthW = district.grid_size[1] * tileSize;
  const cx = originX + widthW / 2 - tileSize / 2;
  const cz = originZ + depthW / 2 - tileSize / 2;

  const tintedColor = useMemo(() => {
    const c = new THREE.Color(district.color);
    // Mezcla con grafito para no saturar
    const dark = new THREE.Color("#1c1917");
    return c.lerp(dark, 0.7);
  }, [district.color]);

  const isFuture = district.id === "futuro";

  return (
    <group>
      {/* Plataforma base */}
      <mesh
        position={[cx, 0.005, cz]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[widthW - 0.4, depthW - 0.4]} />
        <meshStandardMaterial
          color={tintedColor}
          roughness={0.8}
          metalness={0.4}
          transparent
          opacity={isFuture ? 0.3 : 0.55}
        />
      </mesh>

      {/* Borde brillante del distrito */}
      <lineSegments position={[cx, 0.02, cz]}>
        <edgesGeometry
          args={[new THREE.PlaneGeometry(widthW - 0.4, depthW - 0.4)]}
        />
        <lineBasicMaterial
          color={district.color}
          transparent
          opacity={isFuture ? 0.4 : 0.7}
        />
      </lineSegments>

      {/* Label del distrito flotando arriba */}
      <Text
        position={[cx, 0.05, originZ - tileSize * 0.4]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.6}
        color={district.color}
        anchorX="center"
        anchorY="middle"
        font="https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIa1ZL7W0Q5nw.woff"
        fillOpacity={0.95}
        outlineWidth={0.02}
        outlineColor="#0a0806"
      >
        {district.label.toUpperCase()}
      </Text>
    </group>
  );
}
