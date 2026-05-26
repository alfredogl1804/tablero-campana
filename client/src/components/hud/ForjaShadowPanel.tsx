import { motion, AnimatePresence } from "framer-motion";
import { X, Shield, Lock } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface ForjaShadowPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ForjaShadowPanel({ isOpen, onClose }: ForjaShadowPanelProps) {
  const allowlist = trpc.forjaShadow.allowlist.useQuery(undefined, {
    enabled: isOpen,
  });
  const stats = trpc.forjaShadow.stats.useQuery(undefined, {
    enabled: isOpen,
    refetchInterval: 5_000,
  });
  const list = trpc.forjaShadow.list.useQuery(
    { limit: 50 },
    { enabled: isOpen, refetchInterval: 5_000 },
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/50 z-30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className="fixed right-0 top-0 h-full w-full max-w-2xl bg-zinc-950 border-l border-amber-700/40 z-40 overflow-y-auto pointer-events-auto shadow-2xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 280, damping: 30 }}
          >
            <header className="sticky top-0 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 px-6 py-4 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-amber-500" />
                  <h2 className="text-lg font-semibold text-amber-50">
                    Forja shadow adapter
                  </h2>
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  Intents observacionales hacia el kernel — nunca se ejecutan.
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-zinc-400 hover:text-zinc-100 transition"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="px-6 py-4 space-y-5">
              <div className="border border-amber-700/30 bg-amber-950/30 rounded-lg p-3 text-xs text-amber-100 flex gap-2 items-start">
                <Lock className="h-4 w-4 mt-0.5 flex-none" />
                <div>
                  <strong className="block text-amber-200">
                    Modo shadow estricto
                  </strong>
                  <span className="text-amber-200/80">
                    {allowlist.data?.note ??
                      "Todas las llamadas se registran como intent. El kernel jamás se invoca. El switch a enforce requiere un DSC firmado por Alfredo."}
                  </span>
                </div>
              </div>

              <section>
                <h3 className="text-sm font-medium text-zinc-300 mb-2">
                  Telemetría
                </h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="border border-zinc-800 rounded-md px-3 py-2 bg-zinc-900/50">
                    <div className="text-zinc-500 uppercase tracking-wide text-[10px]">
                      Total intents
                    </div>
                    <div className="text-2xl font-mono text-amber-100 mt-1">
                      {stats.data?.total ?? "—"}
                    </div>
                  </div>
                  <div className="border border-zinc-800 rounded-md px-3 py-2 bg-zinc-900/50">
                    <div className="text-zinc-500 uppercase tracking-wide text-[10px]">
                      Último intent
                    </div>
                    <div className="text-xs font-mono text-zinc-300 mt-1">
                      {stats.data?.lastCallAt
                        ? new Date(stats.data.lastCallAt).toLocaleString()
                        : "—"}
                    </div>
                  </div>
                </div>
                {stats.data?.byEndpoint &&
                  Object.keys(stats.data.byEndpoint).length > 0 && (
                    <div className="mt-3 text-xs">
                      <div className="text-zinc-500 mb-1">Por endpoint:</div>
                      <ul className="space-y-1">
                        {Object.entries(stats.data.byEndpoint).map(
                          ([ep, count]) => (
                            <li
                              key={ep}
                              className="flex justify-between text-zinc-300"
                            >
                              <code className="text-cyan-400">{ep}</code>
                              <span className="font-mono">{count}</span>
                            </li>
                          ),
                        )}
                      </ul>
                    </div>
                  )}
              </section>

              <section>
                <h3 className="text-sm font-medium text-zinc-300 mb-2">
                  Whitelist canónica (ADR 0002)
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {(allowlist.data?.endpoints ?? []).map((ep) => (
                    <code
                      key={ep}
                      className="text-[11px] px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-cyan-300 font-mono"
                    >
                      {ep}
                    </code>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="text-sm font-medium text-zinc-300 mb-2">
                  Últimos intents ({list.data?.length ?? 0})
                </h3>
                {list.isLoading ? (
                  <div className="text-xs text-zinc-500">Cargando…</div>
                ) : !list.data || list.data.length === 0 ? (
                  <div className="text-xs text-zinc-500 italic border border-dashed border-zinc-800 rounded-md px-3 py-4 text-center">
                    Aún no hay intents registrados.
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {list.data.map((c) => (
                      <li
                        key={c.callId}
                        className="border border-zinc-800 rounded-md px-3 py-2 bg-zinc-900/40 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <code className="text-cyan-400 truncate">
                            {c.endpoint}
                          </code>
                          <span className="text-[10px] uppercase tracking-wide font-mono text-amber-400 bg-amber-900/30 border border-amber-700/40 px-1.5 py-0.5 rounded">
                            {c.intent}
                          </span>
                        </div>
                        <div className="text-zinc-500 font-mono text-[10px]">
                          hash {c.bodyHash.slice(0, 16)}…
                          {c.actorRole ? ` · actor ${c.actorRole}` : ""}
                          {c.reasonNote ? ` · ${c.reasonNote}` : ""}
                        </div>
                        <div className="text-zinc-600 text-[10px]">
                          {new Date(c.wouldCallAt).toLocaleString()}
                        </div>
                        {c.bodyPreview && (
                          <pre className="bg-black/40 border border-zinc-800 rounded px-2 py-1 text-[10px] text-zinc-300 overflow-x-auto whitespace-pre-wrap break-all">
                            {c.bodyPreview}
                          </pre>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
