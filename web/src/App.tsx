import { useCallback, useEffect, useState } from "react";

const TOOL_NAME = "obter_versiculo_diario";

type Versiculo = {
  reference?: string;
  text?: string;
};

declare global {
  interface Window {
    openai?: {
      toolOutput?: Versiculo;
      toolResponseMetadata?: Record<string, unknown>;
      widgetState?: Record<string, unknown>;
      setWidgetState?: (state: Record<string, unknown>) => void;
      callTool?: (name: string, input: Record<string, unknown>) => Promise<any>;
    };
  }
}

export default function App() {
  const [versiculo, setVersiculo] = useState<Versiculo>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const initial = window.openai?.toolOutput ?? {};
    setVersiculo(initial);
  }, []);

  const refresh = useCallback(async () => {
    if (!window.openai?.callTool) return;
    setLoading(true);
    try {
      const response = await window.openai.callTool(TOOL_NAME, {});
      const structured = response?.structuredContent || response?.output || {};
      setVersiculo(structured);
      window.openai?.setWidgetState?.({ lastReference: structured.reference });
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="card">
      <h1>Versículo do Dia</h1>
      <p className="verse">{versiculo.text || "Carregando..."}</p>
      <p className="reference">{versiculo.reference || ""}</p>
      <button onClick={refresh} disabled={loading}>
        {loading ? "Atualizando..." : "Novo versículo"}
      </button>
    </div>
  );
}
