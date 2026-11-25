import { describe, expect, it } from "vitest";
import { rankGames } from "./leaderboard.mjs";

describe("rankGames", () => {
    it("orders by rating and shares competition ranks for ties", () => {
        const games = [
            { id: 1, title: "Zulu", genre: "Puzzle", starRating: 4.5 },
            { id: 2, title: "Alpha", genre: "Puzzle", starRating: 4.5 },
            { id: 3, title: "Bright", genre: "Puzzle", starRating: 5 },
        ];

        expect(rankGames(games)).toEqual([
            { id: 3, title: "Bright", genre: "Puzzle", starRating: 5, rank: 1 },
            { id: 2, title: "Alpha", genre: "Puzzle", starRating: 4.5, rank: 2 },
            { id: 1, title: "Zulu", genre: "Puzzle", starRating: 4.5, rank: 2 },
        ]);
    });

    it("places unrated games last without assigning them a rank", () => {
        const games = [
            { id: 1, title: "No rating B", genre: "Puzzle", starRating: null },
            { id: 2, title: "Rated", genre: "Puzzle", starRating: 3.5 },
            { id: 3, title: "No rating A", genre: "Puzzle", starRating: null },
        ];

        expect(rankGames(games).map(({ title, rank }) => [title, rank])).toEqual([
            ["Rated", 1],
            ["No rating A", null],
            ["No rating B", null],
        ]);
    });

    it("filters by genre before assigning ranks", () => {
        const games = [
            { id: 1, title: "Puzzle leader", genre: "Puzzle", starRating: 5 },
            { id: 2, title: "Strategy game", genre: "Strategy", starRating: 4 },
            { id: 3, title: "Puzzle game", genre: "Puzzle", starRating: 3 },
        ];

        expect(rankGames(games, "Strategy").map(({ title, rank }) => [title, rank])).toEqual([
            ["Strategy game", 1],
        ]);
    });

    it("returns no rows for an empty genre selection", () => {
        expect(rankGames([], "Puzzle")).toEqual([]);
    });
});
