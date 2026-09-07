# TSCP Content Strategy Agent

An AI agent that plans social media content for **The Supply Chain Project (TSCP)** by combining external benchmarking with a structured, repeatable planning process — so volunteer designers always know what to make, when, and why.

## 1. Client & Context

- **Client:** The Supply Chain Project (TSCP) — a US-based nonprofit connecting products/services to other NGOs and supply chains, run largely by international volunteers (current team includes volunteers based in Bolivia).
- **Engagement model:** pro bono / strategic alliance (ongoing IT consulting relationship, not a cold engagement).
- **Deliverables language:** English (client-facing).

## 2. Problem Statement

Feedback from the volunteer design team highlighted a recurring bottleneck in TSCP's content operation:

- Content is produced without any external **benchmarking** step — themes and formats aren't validated against what's working elsewhere.
- There is no consistent **calendar**: designers can't foresee their workload, and hitting even one post in a week depends on luck rather than a process.
- Planning happens per campaign in isolation, when in reality TSCP runs **several campaigns concurrently** (e.g., a "Volunteering" campaign — currently the strongest performer on LinkedIn — and a campaign promoting the TSCP marketplace).
- There's no minimum output threshold today, which is understandable for a volunteer-run NGO, but the team wants a realistic floor: **at least 2–3 posts per week**, distributed across the active campaigns, to fix the publishing flow.

## 3. Objective

Build an agent that, using external benchmarking, outputs for each planning cycle:

1. **Theme** — a content topic/angle grounded in what's currently resonating externally (similar NGOs, nonprofits, supply-chain orgs).
2. **Calendar** — a schedule of posts (minimum 2–3/week) distributed across TSCP's active campaigns, so designers can plan their time in advance.
3. **Idea + CTA** — a concrete content idea and call-to-action for each scheduled post.
4. **Format skeleton** — a suggested structure for the post, chosen from:
   - Individual post (feed)
   - Reel / vertical video
   - Multipage carousel

## 4. Scope (v1)

**In scope:**
- Benchmarking a defined set of external reference accounts/sources (NGOs, nonprofits, supply-chain orgs) for trending themes and formats.
- Generating a recurring content calendar (weekly/monthly) mapped to TSCP's existing campaigns.
- Producing, per scheduled post: theme, idea, CTA, and format skeleton.
- Output in a format the design team can consume directly (e.g., a structured calendar document/sheet).

**Out of scope (for v1):**
- Actual asset design/production (copy, graphics, video editing).
- Auto-publishing to social platforms.
- Performance/analytics tracking after publication (possible v2).

## 5. Proposed Architecture (Codex CLI subagents)

Built as custom **Codex CLI subagents** — standalone TOML files under `.codex/agents/`, each with a `name`, `description`, and `developer_instructions`:

| Subagent file | `name` | Responsibility |
|---|---|---|
| `.codex/agents/benchmark.toml` | `benchmark` | Scans external sources for trending topics/formats among NGOs, nonprofits, and supply-chain content. |
| `.codex/agents/strategy.toml` | `strategy` | Turns benchmarking findings into a theme + calendar slot, balanced across active campaigns and the 2–3/week floor. |
| `.codex/agents/creative.toml` | `creative` | Drafts the idea, CTA, and post-format skeleton for each calendar slot. |

**Orchestration:** Codex does not auto-spawn custom subagents, so a main Codex session (or a thin `orchestrator` agent) explicitly delegates to `benchmark` → `strategy` → `creative` in sequence via prompts, then assembles the results into the final calendar.

*(First-pass architecture — subagent instructions will be refined as we test each one.)*

## 6. Output Format (draft)

Each planning cycle should produce a calendar with, per post:

| Date | Campaign | Theme | Format | Idea | CTA |
|---|---|---|---|---|---|

## 7. Tech Stack

- **Runtime:** [OpenAI Codex CLI](https://developers.openai.com/codex)
- **Subagents:** custom agents defined as TOML files in `.codex/agents/` (project-scoped, versioned in this repo). Built-in types (`default`, `worker`, `explorer`) are available too, but the planning logic lives in the custom ones above.
- **Project context:** `AGENTS.md` at the repo root holds durable facts Codex should always have — client background, active campaigns, benchmarking sources, the 2–3 posts/week rule.
- **Concurrency (if needed later):** bounded via `.codex/config.toml` (`[agents]` section — `max_threads`, `max_depth`) so a benchmarking fan-out doesn't run away.

## 8. Planned Project Structure

```
tscp-content-agent/
├── README.md
├── AGENTS.md                 # durable project context for Codex (client, campaigns, rules)
├── .codex/
│   ├── config.toml           # agent concurrency / model config
│   └── agents/
│       ├── benchmark.toml    # Benchmarking subagent
│       ├── strategy.toml     # Strategy subagent (theme + calendar)
│       └── creative.toml     # Creative subagent (idea, CTA, format)
├── docs/                      # requirements, client notes, benchmarking sources
└── output/                    # generated calendars
```

## 9. Status

🟡 **Requirements gathering / architecture design** — this README captures the initial scope from client requirements. Tech stack confirmed: Codex CLI with custom subagents. Next step: write `AGENTS.md` and scaffold the first subagent, `.codex/agents/benchmark.toml`.

## 10. Benchmark Request Automation

The dependency-free script `scripts/request_benchmark.py` creates a standardized benchmark request from the active TSCP configuration and enabled source list. The request package follows `contracts/benchmark-request.schema.json` and includes the contract required for the benchmark result. It generates both a JSON request package and an English prompt for the `benchmark` agent.

```bash
python3 scripts/request_benchmark.py --month 2026-10
```

For an ad hoc period:

```bash
python3 scripts/request_benchmark.py \
  --from 2026-10-01 \
  --to 2026-10-31 \
  --trigger on_demand
```

Generated request files are written to `data/benchmark/requests/`. The benchmark result itself should be saved as `data/benchmark/YYYY-MM.json` and must conform to `contracts/benchmark-input.schema.json`.

## 11. Persistent Notion Administration

Notion is the persistent no-code administration layer for campaigns, target audiences, and benchmark sources. Codex is configured globally and at project level with the authenticated Notion MCP server. Agents should read the configured Notion administration page first and use the local JSON files as an explicit fallback when Notion is unavailable.

Administration page: `https://app.notion.com/p/3d4005c30a7d813fbb29ce01e4263f24?pvs=204`

## 12. Repository and Supabase Integration

The project is versioned at `https://github.com/adrianbutsos/p-tscp.git` on the `main` branch. Supabase is project-scoped to `hrbqwypclzbfanjdmwpc`. Database schema changes belong in versioned `supabase/migrations/` files, while local JSON remains the fallback for configuration. The MCP is project-scoped; enable only the feature groups required by the current workflow.
