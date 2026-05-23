/**
 * EL MONSTRUO — Tablero de Campaña v2.0 (Forja Industrial Brutalista)
 * Página principal que orquesta:
 * - Canvas 3D isométrico (IsometricBoard)
 * - HUD 2D overlay (LivePulse, ContextCard, Omnibox, TopToolbar)
 * - Tutorial onboarding la primera vez
 */
import { useState, useEffect, useMemo } from "react";
import { AnimatePresence } from "framer-motion";
import { IsometricBoard } from "@/components/board/IsometricBoard";
import { LivePulse } from "@/components/hud/LivePulse";
import { ContextCard } from "@/components/hud/ContextCard";
import { Omnibox } from "@/components/hud/Omnibox";
import { TopToolbar } from "@/components/hud/TopToolbar";
import { TutorialOverlay } from "@/components/hud/TutorialOverlay";
import boardDataRaw from "@/data/board_data.json";
import type { BoardData } from "@/lib/board-types";

const boardData = boardDataRaw as BoardData;
const TUTORIAL_KEY = "tablero-campana-tutorial-shown-v1";

export default function Home() {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(28);
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    // Mostrar tutorial si nunca se ha visto
    const seen = localStorage.getItem(TUTORIAL_KEY);
    if (!seen) {
      const timer = setTimeout(() => setShowTutorial(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const selectedNode = useMemo(
    () => boardData.nodes.find((n) => n.id === selectedNodeId) ?? null,
    [selectedNodeId]
  );

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

      {/* Vignette ambient para profundidad (no bloquea clicks) */}
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 40%, rgba(10, 8, 6, 0.5) 100%)",
        }}
      />

      {/* HUD 2D Overlay */}
      <div className="absolute inset-0 z-20 pointer-events-none">
        <LivePulse data={boardData} />
        <ContextCard
          node={selectedNode}
          data={boardData}
          onClose={() => setSelectedNodeId(null)}
          onSelectNode={setSelectedNodeId}
        />
        <TopToolbar
          zoomLevel={zoomLevel}
          onZoomChange={setZoomLevel}
          onResetView={handleResetView}
        />
        <Omnibox data={boardData} onSelectNode={setSelectedNodeId} />
      </div>

      {/* Tutorial */}
      <AnimatePresence>
        {showTutorial && <TutorialOverlay onClose={handleCloseTutorial} />}
      </AnimatePresence>
    </div>
  );
}
