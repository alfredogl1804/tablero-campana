"use no memo";
/**
 * EL MONSTRUO — Tablero de Campaña v2.0 (Forja Industrial Brutalista)
 * Página principal que orquesta:
 * - Canvas 3D isométrico (IsometricBoard)
 * - HUD 2D overlay (LivePulse, ContextCard, Omnibox, TopToolbar)
 * - Tutorial onboarding la primera vez
 * - SceneOrchestrator: monta modales/studios según el Scene Contract (T9)
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
import { TimelineSlider } from "@/components/hud/TimelineSlider";
import { SprintsPanel } from "@/components/hud/SprintsPanel";
import { EventStream } from "@/components/hud/EventStream";
import { StarMapPanel } from "@/components/hud/StarMapPanel";
import { ForjaShadowPanel } from "@/components/hud/ForjaShadowPanel";
import { useBoardGestures } from "@/hooks/useBoardGestures";
import { SceneOrchestrator } from "@/components/scene/SceneOrchestrator";
import { resolveCapability, type NodeCapability } from "@/lib/scene-contract";
import { useCausalDiff } from "@/hooks/useCausalDiff";
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
  // T5 — viaje en el tiempo: null = viendo el ahora, número = snapshot histórico activo
  const [travelSnapshotId, setTravelSnapshotId] = useState<number | null>(null);
  // Sprint Observatorio v1.1 / Hito B-lite — panel de sprints fantasma.
  const [showSprintsPanel, setShowSprintsPanel] = useState(false);
  // Sprint Observatorio v1.1 / Hito C — mapa estelar del ecosistema.
  const [showStarMap, setShowStarMap] = useState(false);
  const [showForjaShadow, setShowForjaShadow] = useState(false);

  // Sincronización viva: el tablero refleja el snapshot más reciente del Monstruo,
  // refrescado automáticamente cada 60s sin acción del usuario (T1 del Sprint v3.0).
  // Cuando el usuario viaja al pasado (T5), el refetch del live se pausa para no
  // sobrescribir el snapshot histórico que está mirando.
  const liveBoard = trpc.board.current.useQuery(undefined, {
    refetchInterval: travelSnapshotId === null ? 60_000 : false,
    refetchOnWindowFocus: travelSnapshotId === null,
    retry: 1,
  });

  // T5 — cuando hay un id de viaje activo, traemos ese snapshot histórico
  const travelBoard = trpc.board.byId.useQuery(
    { id: travelSnapshotId ?? 0 },
    {
      enabled: travelSnapshotId !== null,
      staleTime: 5 * 60 * 1000,
    },
  );

  const boardData: BoardData = useMemo(() => {
    // Prioridad 1: snapshot histórico activo (viaje en el tiempo)
    if (travelSnapshotId !== null && travelBoard.data?.payload) {
      const histPayload = travelBoard.data.payload as unknown as BoardData | undefined;
      if (histPayload && Array.isArray(histPayload.nodes) && histPayload.nodes.length > 0) {
        // Sprint v4.0 / T6B — inyectar Truth Ledger del snapshot histórico.
        return {
          ...histPayload,
          node_states: travelBoard.data.nodeStates ?? undefined,
        } satisfies BoardData;
      }
    }
    // Prioridad 2: snapshot vivo (live)
    const livePayload = liveBoard.data?.payload as BoardData | undefined;
    if (livePayload && Array.isArray(livePayload.nodes) && livePayload.nodes.length > 0) {
      // Sprint v4.0 / T6B — inyectar Truth Ledger del snapshot vigente.
      return {
        ...livePayload,
        node_states: liveBoard.data?.nodeStates ?? undefined,
      } satisfies BoardData;
    }
    // Prioridad 3: fallback estático empacado (sin Truth Ledger)
    return staticBoardData;
  }, [liveBoard.data, travelBoard.data, travelSnapshotId]);

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

  // T9 — Scene Contract: la capability se resuelve a partir del nodo seleccionado.
  // Si la capability es `context-card`, la HUD card se muestra normal.
  // Si es `modal` o `studio`, el SceneOrchestrator monta el componente y
  // la HUD card se oculta porque el nodo seleccionado se "consume" en la transición.
  const capability: NodeCapability = useMemo(
    () => resolveCapability(selectedNodeId),
    [selectedNodeId],
  );

  // El ContextCard solo debe renderizar cuando la capability es context-card.
  // Para los otros casos (modal/studio), el SceneOrchestrator se encarga.
  const selectedNode = useMemo(() => {
    if (capability.open !== "context-card") return null;
    return boardData.nodes.find((n) => n.id === selectedNodeId) ?? null;
  }, [selectedNodeId, boardData, capability]);

  const handleCloseTutorial = () => {
    localStorage.setItem(TUTORIAL_KEY, "true");
    setShowTutorial(false);
  };

  const handleResetView = () => {
    setSelectedNodeId(null);
    setZoomLevel(28);
  };

  // T7 Sprint v3.0 — gestos táctiles iPhone (pinch zoom + double-tap reset)
  const gestureBind = useBoardGestures({
    zoom: zoomLevel,
    setZoom: setZoomLevel,
    onDoubleTap: handleResetView,
    zoomBounds: { min: 14, max: 60 },
  });

  // T9 — cuando un modal/studio quiere abrir un nodo (ej. el ContextCard
  // dispara "Abrir Studio operable"), reusamos el setter del nodeId y el
  // registry resuelve la capability automáticamente.
  const handleSelectNode = (id: string | null) => setSelectedNodeId(id);

  // T8 — Causal Timeline: cuando el usuario viaja en el tiempo, comparamos
  // el snapshot histórico vs el vigente para colorear los nodos según su
  // cambio causal (added/removed/status-changed/metric-changed).
  const causal = useCausalDiff(
    travelSnapshotId,
    liveBoard.data?.id ?? null,
  );

  return (
    <div className="fixed inset-0 overflow-hidden bg-background">
      {/* Canvas 3D */}
      <div
        className="absolute inset-0 z-0 touch-none"
        {...gestureBind()}
      >
        <IsometricBoard
          data={boardData}
          selectedNodeId={selectedNodeId}
          hoveredNodeId={hoveredNodeId}
          onSelectNode={handleSelectNode}
          onHoverNode={setHoveredNodeId}
          zoomLevel={zoomLevel}
          causalStateByNode={causal.causalStateByNode}
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
          onSelectNode={handleSelectNode}
        />
        <TopToolbar
          zoomLevel={zoomLevel}
          onZoomChange={setZoomLevel}
          onResetView={handleResetView}
          onOpenHelp={() => setShowTutorial(true)}
        />
        <Omnibox data={boardData} onSelectNode={handleSelectNode} />
        <LayerSwitcher data={boardData} />
        <TimelineSlider
          activeSnapshotId={travelSnapshotId}
          currentSnapshotId={liveBoard.data?.id ?? null}
          onSelectSnapshot={setTravelSnapshotId}
        />
      </div>

      {/* Tutorial */}
      <AnimatePresence>
        {showTutorial && <TutorialOverlay onClose={handleCloseTutorial} />}
      </AnimatePresence>

      {/* T9 — Scene Contract: monta modal/studio según el registry */}
      <SceneOrchestrator
        capability={capability}
        onCloseCapability={() => setSelectedNodeId(null)}
      />

      {/* Hito B-lite — botón flotante para abrir el panel de sprints */}
      <button
        onClick={() => setShowSprintsPanel(true)}
        className="absolute top-4 right-32 z-30 px-3 py-1.5 bg-[#1a0e05] hover:bg-[#2a1808] border border-orange-900/50 hover:border-orange-700 rounded text-orange-300 hover:text-orange-200 text-xs uppercase tracking-[0.15em] font-bold transition pointer-events-auto shadow-lg flex items-center gap-2"
        aria-label="Abrir panel de sprints"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
        Sprints
      </button>

      <SprintsPanel
        open={showSprintsPanel}
        onClose={() => setShowSprintsPanel(false)}
      />

      {/* Hito C — botón Mapa Estelar del ecosistema */}
      <button
        onClick={() => setShowStarMap(true)}
        className="absolute top-4 right-56 z-30 px-3 py-1.5 bg-[#0a0a18] hover:bg-[#14142a] border border-purple-900/50 hover:border-purple-700 rounded text-purple-300 hover:text-purple-200 text-xs uppercase tracking-[0.15em] font-bold transition pointer-events-auto shadow-lg flex items-center gap-2"
        aria-label="Abrir mapa estelar del ecosistema"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
        Estrellas
      </button>

      <StarMapPanel
        open={showStarMap}
        onClose={() => setShowStarMap(false)}
      />

      {/* Hito 8 — botón Forja shadow adapter */}
      <button
        onClick={() => setShowForjaShadow(true)}
        className="absolute top-4 right-80 z-30 px-3 py-1.5 bg-[#1a0a05] hover:bg-[#2a1009] border border-amber-900/50 hover:border-amber-700 rounded text-amber-300 hover:text-amber-200 text-xs uppercase tracking-[0.15em] font-bold transition pointer-events-auto shadow-lg flex items-center gap-2"
        aria-label="Abrir panel Forja shadow"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        Forja
      </button>

      <ForjaShadowPanel
        isOpen={showForjaShadow}
        onClose={() => setShowForjaShadow(false)}
      />

      {/* Hito A — stream firmado del observatorio (bus ed25519) */}
      <EventStream />
    </div>
  );
}
