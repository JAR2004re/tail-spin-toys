import { DatabaseSync } from "node:sqlite";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { CanvasError, createCanvas, joinSession } from "@github/copilot-sdk/extension";
import { rankGames } from "./leaderboard.mjs";

const servers = new Map();
const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

function getDatabasePath() {
    const databaseUrl = process.env.DATABASE_URL ?? "file:tailspin.db";
    if (!databaseUrl.startsWith("file:")) {
        throw new Error("DATABASE_URL must be a local file: URL for the Game Leaderboard canvas.");
    }

    const path = databaseUrl.startsWith("file://")
        ? fileURLToPath(databaseUrl)
        : databaseUrl.slice("file:".length);
    if (!path) {
        throw new Error("DATABASE_URL must include a database file path.");
    }

    return resolve(PROJECT_ROOT, path);
}

function readCatalog() {
    const database = new DatabaseSync(getDatabasePath(), { readOnly: true });
    try {
        return database.prepare(`
            SELECT games.id, games.title, games.star_rating AS starRating, categories.name AS genre
            FROM games
            INNER JOIN categories ON games.category_id = categories.id
        `).all();
    } finally {
        database.close();
    }
}

function getLeaderboard(genre = "all") {
    const games = readCatalog();
    const genres = [...new Set(games.map((game) => game.genre))].sort((left, right) =>
        left.localeCompare(right, "en"),
    );

    if (genre !== "all" && !genres.includes(genre)) {
        throw new CanvasError("leaderboard_genre_not_found", `No catalog genre named "${genre}" exists.`);
    }

    return { genre, genres, rows: rankGames(games, genre) };
}

function sendJson(response, status, data) {
    response.writeHead(status, {
        "Cache-Control": "no-store",
        "Content-Type": "application/json; charset=utf-8",
    });
    response.end(JSON.stringify(data));
}

function renderHtml() {
    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="var(--background-color-default, #ffffff)" />
    <title>Game Leaderboard</title>
    <style>
      :root { --status-bar-color: var(--background-color-default, #ffffff); }
      * { box-sizing: border-box; }
      body { margin: 0; background: var(--background-color-default, #ffffff); color: var(--text-color-default, #1f2328); font: var(--text-body-medium, 14px)/var(--leading-body-medium, 20px) var(--font-sans, system-ui, sans-serif); }
      main { margin: 0 auto; max-width: 1080px; padding: clamp(18px, 4vw, 36px); }
      header { align-items: flex-start; border-bottom: 1px solid var(--border-color-default, #d0d7de); display: flex; flex-wrap: wrap; gap: 20px; justify-content: space-between; margin-bottom: 24px; padding-bottom: 20px; }
      h1 { font-family: var(--font-sans-display, var(--font-sans, system-ui, sans-serif)); font-size: clamp(26px, 4vw, 36px); font-weight: var(--font-weight-semibold, 600); letter-spacing: -0.025em; line-height: 1.15; margin: 0; }
      h2 { font-size: 15px; font-weight: var(--font-weight-semibold, 600); margin: 0; }
      .lede { color: var(--text-color-muted, #59636e); margin: 8px 0 0; max-width: 70ch; }
      .badge { background: var(--true-color-blue-muted, #ddf4ff); border: 1px solid var(--true-color-blue, #0969da); border-radius: 999px; color: var(--true-color-blue, #0969da); font-size: 12px; font-weight: var(--font-weight-semibold, 600); padding: 3px 10px; white-space: nowrap; }
      .controls { align-items: end; display: flex; flex-wrap: wrap; gap: 12px; justify-content: space-between; margin-bottom: 16px; }
      label { color: var(--text-color-muted, #59636e); display: grid; font-size: 12px; gap: 5px; }
      select, button { background: var(--background-color-default, #ffffff); border: 1px solid var(--border-color-default, #d0d7de); border-radius: 7px; color: var(--text-color-default, #1f2328); font: inherit; min-height: 38px; padding: 7px 10px; }
      select { min-width: 190px; }
      button { background: var(--true-color-blue, #0969da); border-color: var(--true-color-blue, #0969da); color: var(--color-white, #ffffff); cursor: pointer; font-weight: var(--font-weight-semibold, 600); }
      button:hover:not(:disabled) { filter: brightness(1.08); }
      button:disabled { cursor: wait; opacity: 0.65; }
      select:focus-visible, button:focus-visible { outline: 2px solid var(--color-focus-outline, #0969da); outline-offset: 2px; }
      .panel { background: color-mix(in srgb, var(--background-color-default, #ffffff) 94%, var(--text-color-default, #1f2328) 6%); border: 1px solid var(--border-color-default, #d0d7de); border-radius: 12px; overflow: hidden; }
      .panel-heading { align-items: center; display: flex; flex-wrap: wrap; gap: 8px 18px; justify-content: space-between; padding: 16px 18px; }
      .panel-heading p { color: var(--text-color-muted, #59636e); font-size: 12px; margin: 0; }
      .table-wrap { overflow-x: auto; }
      table { border-collapse: collapse; min-width: 580px; width: 100%; }
      th, td { border-top: 1px solid var(--border-color-default, #d0d7de); padding: 12px 18px; text-align: left; }
      th { background: color-mix(in srgb, var(--background-color-default, #ffffff) 88%, var(--text-color-default, #1f2328) 12%); color: var(--text-color-muted, #59636e); font-size: 11px; font-weight: var(--font-weight-semibold, 600); letter-spacing: 0.04em; text-transform: uppercase; }
      td:first-child { color: var(--text-color-muted, #59636e); font-variant-numeric: tabular-nums; white-space: nowrap; width: 88px; }
      .game-title { font-weight: var(--font-weight-semibold, 600); }
      .rating { font-variant-numeric: tabular-nums; white-space: nowrap; }
      .muted, #status { color: var(--text-color-muted, #59636e); }
      .empty { color: var(--text-color-muted, #59636e); padding: 26px 18px; text-align: center; }
      .error { color: var(--true-color-red, #cf222e) !important; }
      footer { color: var(--text-color-muted, #59636e); font-size: 12px; margin-top: 12px; }
      @media (max-width: 540px) { .controls { align-items: stretch; flex-direction: column; } select, button { width: 100%; } }
      @media (prefers-reduced-motion: reduce) { *, *::before, *::after { scroll-behavior: auto !important; transition-duration: 0.01ms !important; } }
    </style>
  </head>
  <body>
    <main>
      <header>
        <div>
          <h1>Game Leaderboard</h1>
          <p class="lede">Ranked by the catalog's existing star ratings—not gameplay scores or live backing activity.</p>
        </div>
        <span class="badge">Read-only</span>
      </header>
      <section aria-label="Game leaderboard">
        <div class="controls">
          <label for="genre">Filter by genre
            <select id="genre" data-testid="genre-filter">
              <option value="all">All genres</option>
            </select>
          </label>
          <button id="refresh" type="button" data-testid="refresh-leaderboard">Refresh catalog</button>
        </div>
        <div class="panel">
          <div class="panel-heading">
            <h2>Catalog ratings</h2>
            <p id="count"></p>
          </div>
          <div id="results" class="table-wrap"></div>
        </div>
        <p id="status" role="status" aria-live="polite"></p>
        <footer>Tied ratings share a rank; unrated games appear last. Refresh reloads the project catalog snapshot.</footer>
      </section>
    </main>
    <script>
      const genreFilter = document.querySelector("#genre");
      const refreshButton = document.querySelector("#refresh");
      const results = document.querySelector("#results");
      const count = document.querySelector("#count");
      const status = document.querySelector("#status");
      let requestNumber = 0;

      function renderGenres(genres, selectedGenre) {
        const options = [new Option("All genres", "all"), ...genres.map((genre) => new Option(genre, genre))];
        genreFilter.replaceChildren(...options);
        genreFilter.value = selectedGenre;
      }

      function renderRows(rows) {
        results.replaceChildren();
        if (rows.length === 0) {
          const empty = document.createElement("p");
          empty.className = "empty";
          empty.textContent = "No games are available in this genre.";
          results.append(empty);
          return;
        }

        const table = document.createElement("table");
        const head = table.createTHead().insertRow();
        for (const heading of ["Rank", "Game", "Genre", "Catalog rating"]) {
          const cell = document.createElement("th");
          cell.scope = "col";
          cell.textContent = heading;
          head.append(cell);
        }

        const body = table.createTBody();
        for (const game of rows) {
          const row = body.insertRow();
          const rank = row.insertCell();
          rank.textContent = game.rank === null ? "—" : "#" + game.rank;
          if (game.rank === null) rank.setAttribute("aria-label", "Unrated");
          const title = row.insertCell();
          title.className = "game-title";
          title.textContent = game.title;
          row.insertCell().textContent = game.genre;
          const rating = row.insertCell();
          rating.className = game.starRating === null ? "muted" : "rating";
          rating.textContent = game.starRating === null ? "Unrated" : game.starRating.toFixed(1) + " / 5";
        }
        results.append(table);
      }

      async function loadLeaderboard(genre = genreFilter.value) {
        const currentRequest = ++requestNumber;
        refreshButton.disabled = true;
        status.className = "";
        status.textContent = "Loading catalog ratings...";
        try {
          const response = await fetch("/api/leaderboard?genre=" + encodeURIComponent(genre), { cache: "no-store" });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || "The catalog request failed.");
          if (currentRequest !== requestNumber) return;
          renderGenres(data.genres, data.genre);
          renderRows(data.rows);
          count.textContent = data.rows.length + (data.rows.length === 1 ? " game" : " games");
          status.textContent = "";
        } catch (error) {
          if (currentRequest !== requestNumber) return;
          results.replaceChildren();
          count.textContent = "";
          status.textContent = error instanceof Error ? error.message : "The catalog request failed.";
          status.className = "error";
        } finally {
          if (currentRequest === requestNumber) refreshButton.disabled = false;
        }
      }

      genreFilter.addEventListener("change", () => loadLeaderboard(genreFilter.value));
      refreshButton.addEventListener("click", () => loadLeaderboard());
      loadLeaderboard("all");
    </script>
  </body>
</html>`;
}

async function startServer() {
    const server = createServer(async (request, response) => {
        const url = new URL(request.url ?? "/", "http://127.0.0.1");
        if (url.pathname === "/api/leaderboard" && request.method === "GET") {
            try {
                sendJson(response, 200, getLeaderboard(url.searchParams.get("genre") ?? "all"));
            } catch (error) {
                sendJson(response, error instanceof CanvasError ? 400 : 500, {
                    error: error instanceof Error ? error.message : "The catalog request failed.",
                });
            }
            return;
        }

        if (url.pathname !== "/" || request.method !== "GET") {
            response.writeHead(404);
            response.end();
            return;
        }

        response.writeHead(200, {
            "Cache-Control": "no-store",
            "Content-Type": "text/html; charset=utf-8",
        });
        response.end(renderHtml());
    });

    await new Promise((resolveListen, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", resolveListen);
    });
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    return { server, url: `http://127.0.0.1:${port}/` };
}

await joinSession({
    canvases: [
        createCanvas({
            id: "game-leaderboard",
            displayName: "Game Leaderboard",
            description: "View this project's games ranked by catalog star rating, with genre filtering; ratings are not gameplay scores or live backing activity.",
            actions: [
                {
                    name: "get_leaderboard",
                    description: "Read this project's game leaderboard, optionally filtered by genre. Rankings use catalog star ratings only.",
                    inputSchema: {
                        type: "object",
                        properties: { genre: { type: "string", minLength: 1 } },
                        additionalProperties: false,
                    },
                    handler: async (context) => getLeaderboard(context.input?.genre ?? "all"),
                },
            ],
            open: async (context) => {
                let entry = servers.get(context.instanceId);
                if (!entry) {
                    entry = await startServer();
                    servers.set(context.instanceId, entry);
                }
                return { title: "Game Leaderboard", url: entry.url };
            },
            onClose: async (context) => {
                const entry = servers.get(context.instanceId);
                if (entry) {
                    servers.delete(context.instanceId);
                    await new Promise((resolveClose) => entry.server.close(resolveClose));
                }
            },
        }),
    ],
});
