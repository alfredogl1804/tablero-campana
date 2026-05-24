"use no memo";
/**
 * EL MONSTRUO — Tablero de Campaña v2.0 (Forja Industrial Brutalista)
 * Página principal que orquesta:
 * - Canvas 3D isométrico (IsometricBoard)
 * - HUD 2D overlay (LivePulse, ContextCard, Omnibox, TopToolbar)
 * - Tutorial onboarding la primera vez
 * - Nano Banana Studio (operable, conectado a Gemini real)
 */
import { useState, useEffect, useMemo } from "react";
import { AnimatePresence } from "framer-motion";
import { IsometricBoard } from "@/components/board/IsometricBoard";
import { LivePulse } from "@/components/hud/LivePulse";
import { ContextCard } from "@/components/hud/ContextCard";
import { Omnibox } from "@/components/hud/Omnibox";
import { TopToolbar } from "@/components/hud/TopToolbar";
import { TutorialOverlay } from "@/components/hud/TutorialOverlay";
import { LayerSwitcher } from "@/components/hud/LayerSwitcher";
import { NanoBananaStudio } from "@/components/studio/NanoBananaStudio";
import { CatastroCluster } from "@/components/catastro/CatastroCluster";
import { trpc } from "@/lib/trpc";
import staticBoardDataRaw from "@/data/board_data.json";
import type { BoardData } from "@/lib/board-types";

// El JSON estático es solo el fallback de última instancia. La fuente real
// es trpc.board.current que lee el snapshot vivo desde Drizzle/TiDB.
const staticBoardData = staticBoardDataRaw as unknown as BoardData;
const TUTORIAL_KEY = "tablero-campana-tutorial-shown-v1";

export default function Home() {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(28);
  const [showTutorial, setShowTutorial] = useState(false);
  const [studioOpen, setStudioOpen] = useState(false);
  const [catastroOpen, setCatastroOpen] = useState(false);

  // Sincronización viva: el tablero refleja el snapshot más reciente del Monstruo,
  // refrescado automáticamente cada 60s sin acción del usuario (T1 del Sprint v3.0).
  const liveBoard = trpc.board.current.useQuery(undefined, {
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  const boardData: BoardData = useMemo(() => {
    const livePayload = liveBoard.data?.payload as BoardData | undefined;
    if (livePayload && Array.isArray(livePayload.nodes) && livePayload.nodes.length > 0) {
      return livePayload;
    }
    return staticBoardData;
  }, [liveBoard.data]);

  // Derivar el estado explícito de la sincronización viva para que el HUD
  // pueda mostrarlo. "stale" = el frontend está sirviendo el JSON estático
  // empacado, no datos vivos del Monstruo.
  const boardLiveStatus: "loading" | "live" | "stale" | "error" = liveBoard.isLoading
    ? "loading"
    : liveBoard.error
      ? "error"
      : liveBoard.data && liveBoard.data.payload
        ? "live"
        : "stale";

  const boardCapturedAt = liveBoard.data?.capturedAt ?? null;
  const boardSourceMode = liveBoard.data?.sourceMode ?? null;

  useEffect(() => {
    const seen = localStorage.getItem(TUTORIAL_KEY);
    if (!seen) {
      const timer = setTimeout(() => setShowTutorial(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const selectedNode = useMemo(
    () => boardData.nodes.find((n) => n.id === selectedNodeId) ?? null,
    [selectedNodeId, boardData]
  );

  // Si el usuario selecciona el nodo "catastro" del distrito Cognición,
  // en lugar de mostrar el ContextCard normal, abrimos el CatastroCluster.
  useEffect(() => {
    if (selectedNodeId === "catastro") {
      setCatastroOpen(true);
      // soltamos la selección para que el ContextCard normal no se muestre
      setSelectedNodeId(null);
    }
  }, [selectedNodeId]);

  const handleCloseTutorial = () => {
    localStorage.setItem(TUTORIAL_KEY, "true");
    setShowTutorial(false);
  };

  const handleResetView = () => {
    setSelectedNodeId(null);
    setZoomLevel(28);
  };

  return (
    <div className="fixed inset-0 overflow-hidden bg-background">
      {/* Canvas 3D */}
      <div className="absolute inset-0 z-0">
        <IsometricBoard
          data={boardData}
          selectedNodeId={selectedNodeId}
          hoveredNodeId={hoveredNodeId}
          onSelectNode={setSelectedNodeId}
          onHoverNode={setHoveredNodeId}
          zoomLevel={zoomLevel}
        />
      </div>

      {/* Vignette ambient para profundidad */}
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 40%, rgba(10, 8, 6, 0.5) 100%)",
        }}
      />

      {/* HUD 2D Overlay */}
      <div className="absolute inset-0 z-20 pointer-events-none">
        <LivePulse
          data={boardData}
          liveStatus={boardLiveStatus}
          liveCapturedAt={boardCapturedAt}
          liveSourceMode={boardSourceMode}
        />
        <ContextCard
          node={selectedNode}
          data={boardData}
          onClose={() => setSelectedNodeId(null)}
          onSelectNode={setSelectedNodeId}
          onOpenStudio={() => setStudioOpen(true)}
        />
        <TopToolbar
          zoomLevel={zoomLevel}
          onZoomChange={setZoomLevel}
          onResetView={handleResetView}
          onOpenHelp={() => setShowTutorial(true)}
        />
        <Omnibox data={boardData} onSelectNode={setSelectedNodeId} />
        <LayerSwitcher data={boardData} />
      </div>

      {/* Tutorial */}
      <AnimatePresence>
        {showTutorial && <TutorialOverlay onClose={handleCloseTutorial} />}
      </AnimatePresence>

      {/* Nano Banana Studio (operable) */}
      <NanoBananaStudio open={studioOpen} onClose={() => setStudioOpen(false)} />

      {/* Catastro Cluster — vista isométrica de las 82 candidatas reales */}
      <CatastroCluster
        open={catastroOpen}
        onClose={() => setCatastroOpen(false)}
        onOpenStudio={() => {
          setCatastroOpen(false);
          setStudioOpen(true);
        }}
      />
    </div>
  );
}
