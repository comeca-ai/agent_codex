import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { versiculos } from "./versiculos.js";

const toolName = "obter_versiculo_diario";
const outputTemplateName = "versiculoWidget";
const widgetUri = `template://${outputTemplateName}`;
const widgetCspUri = "openai://widgetCSP";

const outputSchema = z.object({
  reference: z.string(),
  text: z.string()
});

type ToolOutput = z.infer<typeof outputSchema>;

const server = new Server(
  {
    name: "versiculo-diario",
    version: "0.1.0"
  },
  {
    capabilities: {
      tools: {},
      resources: {}
    }
  }
);

function selecionarVersiculo(): ToolOutput {
  const index = Math.floor(Math.random() * versiculos.length);
  return versiculos[index];
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: toolName,
        description:
          "Use this when the user asks for a daily Bible verse or spiritual inspiration. Do not use for explanations, commentary, or multi-verse study.",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false
        },
        outputSchema: {
          type: "object",
          properties: {
            reference: { type: "string" },
            text: { type: "string" }
          },
          required: ["reference", "text"],
          additionalProperties: false
        },
        annotations: {
          readOnlyHint: true,
          openWorldHint: false,
          destructiveHint: false,
          idempotentHint: false
        },
        _meta: {
          "openai/outputTemplate": outputTemplateName,
          "openai/widgetAccessible": true
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name !== toolName) {
    throw new Error(`Tool desconhecida: ${request.params.name}`);
  }

  const versiculo = selecionarVersiculo();
  const output = outputSchema.parse(versiculo);

  return {
    content: [
      {
        type: "text",
        text: `${output.reference} — ${output.text}`
      }
    ],
    structuredContent: output,
    _meta: {
      "openai/outputTemplate": outputTemplateName,
      "openai/widgetState": {
        lastReference: output.reference
      }
    }
  };
});

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: widgetUri,
        name: "Versiculo Diario Widget",
        mimeType: "text/html+skybridge"
      },
      {
        uri: widgetCspUri,
        name: "Widget CSP",
        mimeType: "application/json"
      }
    ]
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  if (request.params.uri === widgetUri) {
    return {
      contents: [
        {
          uri: widgetUri,
          mimeType: "text/html+skybridge",
          text: buildWidgetHtml()
        }
      ]
    };
  }

  if (request.params.uri === widgetCspUri) {
    return {
      contents: [
        {
          uri: widgetCspUri,
          mimeType: "application/json",
          text: JSON.stringify(
            {
              type: "allowlist",
              connect: [],
              img: [],
              script: [],
              style: [],
              frame: []
            },
            null,
            2
          )
        }
      ]
    };
  }

  throw new Error(`Resource desconhecido: ${request.params.uri}`);
});

function buildWidgetHtml() {
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Versículo Diário</title>
    <style>
      body {
        font-family: "Inter", "Segoe UI", system-ui, sans-serif;
        margin: 0;
        padding: 24px;
        background: #f8f5f0;
        color: #1f1d1a;
      }
      .card {
        background: #ffffff;
        border-radius: 16px;
        padding: 24px;
        box-shadow: 0 12px 30px rgba(15, 12, 8, 0.08);
      }
      .title {
        font-size: 18px;
        font-weight: 600;
        margin-bottom: 12px;
      }
      .verse {
        font-size: 20px;
        line-height: 1.6;
        margin-bottom: 12px;
      }
      .reference {
        font-size: 14px;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: #7d6a55;
      }
      .actions {
        margin-top: 16px;
        display: flex;
        justify-content: flex-end;
      }
      button {
        background: #7d6a55;
        color: #fff;
        border: none;
        border-radius: 999px;
        padding: 10px 18px;
        font-size: 14px;
        cursor: pointer;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="title">Versículo do Dia</div>
      <div class="verse" id="verseText">Carregando...</div>
      <div class="reference" id="verseRef"></div>
      <div class="actions">
        <button id="refreshButton" type="button">Novo versículo</button>
      </div>
    </div>
    <script>
      const output = window.openai?.toolOutput || {};
      const { callTool, widgetState, setWidgetState } = window.openai || {};

      function render(data) {
        const verseText = document.getElementById("verseText");
        const verseRef = document.getElementById("verseRef");
        verseText.textContent = data.text || "Nenhum versículo disponível.";
        verseRef.textContent = data.reference || "";
      }

      function updateState(data) {
        if (setWidgetState) {
          setWidgetState({
            lastReference: data.reference
          });
        }
      }

      render(output);

      const refreshButton = document.getElementById("refreshButton");
      refreshButton.addEventListener("click", async () => {
        if (!callTool) return;
        refreshButton.disabled = true;
        try {
          const response = await callTool("${toolName}", {});
          const structured = response?.structuredContent || response?.output || {};
          render(structured);
          updateState(structured);
        } finally {
          refreshButton.disabled = false;
        }
      });

      if (widgetState?.lastReference) {
        document.getElementById("verseRef").textContent = widgetState.lastReference;
      }
    </script>
  </body>
</html>`;
}

const transport = new StdioServerTransport();
await server.connect(transport);
