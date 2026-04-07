export const swaggerSpec = {
    openapi: "3.0.3",
    info: {
        title: "PokéMaster AI API",
        version: "1.0.0",
        description: "Standalone REST API for VGC team analysis. Provides Poképaste parsing, Pikalytics tournament meta scraping, and Gemini AI strategy reports.",
    },
    servers: [{ url: "/", description: "This server" }],
    tags: [
        { name: "System", description: "Health and liveness" },
        { name: "Team", description: "Poképaste parsing and meta scraping" },
        { name: "Analysis", description: "AI-powered strategy reports (SSE)" },
    ],
    components: {
        schemas: {
            PokemonSet: {
                type: "object",
                required: ["species", "moves"],
                properties: {
                    species: { type: "string", example: "Incineroar" },
                    item: { type: "string", example: "Assault Vest" },
                    ability: { type: "string", example: "Intimidate" },
                    teraType: { type: "string", example: "Fire" },
                    evs: { type: "string", example: "252 HP / 4 Atk / 252 SpD" },
                    ivs: { type: "string", example: "0 Atk" },
                    nature: { type: "string", example: "Careful" },
                    moves: {
                        type: "array",
                        items: { type: "string" },
                        example: ["Fake Out", "Knock Off", "Flare Blitz", "Parting Shot"],
                    },
                },
            },
            UsageStat: {
                type: "object",
                required: ["name", "usage"],
                properties: {
                    name: { type: "string", example: "Rillaboom" },
                    usage: { type: "string", example: "42%" },
                },
            },
            PokemonMetaData: {
                type: "object",
                required: ["pokemon", "topTeammates", "topItems", "topMoves"],
                properties: {
                    pokemon: { type: "string", example: "Incineroar" },
                    topTeammates: {
                        type: "array",
                        items: { $ref: "#/components/schemas/UsageStat" },
                    },
                    topItems: {
                        type: "array",
                        items: { $ref: "#/components/schemas/UsageStat" },
                    },
                    topMoves: {
                        type: "array",
                        items: { $ref: "#/components/schemas/UsageStat" },
                    },
                },
            },
            Recommendation: {
                type: "object",
                required: ["focus", "change", "rationale"],
                properties: {
                    focus: { type: "string", example: "Rillaboom" },
                    change: { type: "string", example: "Switch item to Choice Band" },
                    rationale: {
                        type: "string",
                        example: "Grassy Glide priority is underutilized without raw power.",
                    },
                },
            },
            VGCReport: {
                type: "object",
                required: ["metaHoles", "recommendations", "summary"],
                properties: {
                    legalityCheck: {
                        type: "string",
                        example: "Team is 100% legal under Regulation H.",
                    },
                    metaHoles: {
                        type: "array",
                        items: { type: "string" },
                        example: ["No speed control", "Weak to Fairy types"],
                    },
                    recommendations: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Recommendation" },
                    },
                    summary: {
                        type: "string",
                        example: "Solid defensive core with offensive gaps in the lead matchup.",
                    },
                },
            },
            SSELogEvent: {
                type: "object",
                required: ["type", "msg", "status"],
                properties: {
                    type: { type: "string", enum: ["log"] },
                    msg: { type: "string", example: "Scraping context for Incineroar..." },
                    status: {
                        type: "string",
                        enum: ["analyzing", "info", "error", "done"],
                        example: "analyzing",
                    },
                },
            },
            SSETeamEvent: {
                type: "object",
                required: ["type", "parsedTeam"],
                properties: {
                    type: { type: "string", enum: ["team"] },
                    parsedTeam: {
                        type: "array",
                        items: { $ref: "#/components/schemas/PokemonSet" },
                    },
                },
            },
            SSEResultEvent: {
                type: "object",
                required: ["type", "report"],
                properties: {
                    type: { type: "string", enum: ["result"] },
                    report: { $ref: "#/components/schemas/VGCReport" },
                },
            },
            Error: {
                type: "object",
                required: ["error"],
                properties: {
                    error: { type: "string", example: "Missing or invalid rawPaste string in request body" },
                },
            },
        },
    },
    paths: {
        "/health": {
            get: {
                tags: ["System"],
                summary: "Liveness check",
                responses: {
                    "200": {
                        description: "Server is up",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        status: { type: "string", example: "ok" },
                                        version: { type: "string", example: "1.0.0" },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        "/api/v1/parse": {
            post: {
                tags: ["Team"],
                summary: "Parse a Poképaste string",
                description: "Converts a raw Showdown/Poképaste team string into a structured JSON array. No scraping or AI is involved.",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["rawPaste"],
                                properties: {
                                    rawPaste: {
                                        type: "string",
                                        description: "Raw Poképaste / Showdown export text",
                                        example: "Incineroar @ Assault Vest\nAbility: Intimidate\nTera Type: Fire\nEVs: 252 HP / 4 Atk / 252 SpD\nCareful Nature\n- Fake Out\n- Knock Off\n- Flare Blitz\n- Parting Shot",
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "Parsed team array",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "array",
                                    items: { $ref: "#/components/schemas/PokemonSet" },
                                },
                            },
                        },
                    },
                    "400": {
                        description: "Invalid request body",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                },
            },
        },
        "/api/v1/scrape": {
            post: {
                tags: ["Team"],
                summary: "Scrape Pikalytics tournament meta",
                description: "Runs a headless Puppeteer scrape on Pikalytics for each species and returns top teammates, moves, and items. The regulation dataset is controlled by the `PIKALYTICS_REGULATION` environment variable.",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["team"],
                                properties: {
                                    team: {
                                        type: "array",
                                        items: { type: "string" },
                                        description: "Array of Pokémon species names",
                                        example: ["Incineroar", "Rillaboom", "Gholdengo"],
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "Meta data for each species",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "array",
                                    items: { $ref: "#/components/schemas/PokemonMetaData" },
                                },
                            },
                        },
                    },
                    "400": {
                        description: "Invalid request body",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                    "500": {
                        description: "Scraping failed",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                },
            },
        },
        "/api/v1/analyze": {
            post: {
                tags: ["Analysis"],
                summary: "Full pipeline — parse, scrape, and analyze",
                description: "Parses the Poképaste, scrapes Pikalytics meta for every Pokémon, then sends everything to Gemini 2.5 Flash for a strategic report.\n\n**Response is a Server-Sent Events (SSE) stream.** Set `Accept: text/event-stream` and consume the stream incrementally. Three event shapes are emitted:\n\n- `{ type: \"log\", msg, status }` — progress updates throughout the pipeline\n- `{ type: \"team\", parsedTeam }` — emitted early with the parsed team\n- `{ type: \"result\", report }` — final `VGCReport` emitted at the end\n\nThe `apiKey` field is optional if `GOOGLE_GENAI_API_KEY` is set on the server.",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["rawPaste"],
                                properties: {
                                    rawPaste: {
                                        type: "string",
                                        description: "Raw Poképaste / Showdown export text",
                                        example: "Incineroar @ Assault Vest\nAbility: Intimidate\nTera Type: Fire\nEVs: 252 HP / 4 Atk / 252 SpD\nCareful Nature\n- Fake Out\n- Knock Off\n- Flare Blitz\n- Parting Shot",
                                    },
                                    regulation: {
                                        type: "string",
                                        description: "VGC regulation name passed to the AI prompt",
                                        default: "Regulation H",
                                        example: "Regulation H",
                                    },
                                    apiKey: {
                                        type: "string",
                                        description: "Google Gemini API key. Overrides GOOGLE_GENAI_API_KEY env var when provided.",
                                        example: "AIza...",
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "SSE stream — each line is `data: <JSON>\\n\\n`. See description for event shapes.",
                        content: {
                            "text/event-stream": {
                                schema: {
                                    oneOf: [
                                        { $ref: "#/components/schemas/SSELogEvent" },
                                        { $ref: "#/components/schemas/SSETeamEvent" },
                                        { $ref: "#/components/schemas/SSEResultEvent" },
                                    ],
                                },
                            },
                        },
                    },
                    "400": {
                        description: "Invalid request body",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                    "503": {
                        description: "No Gemini API key configured",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                },
            },
        },
    },
};
