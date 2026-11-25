/**
 * @typedef {{
 *   id: number;
 *   title: string;
 *   genre: string;
 *   starRating: number | null;
 * }} LeaderboardGame
 */

/**
 * Filter and rank catalog games by rating, using competition ranking for ties.
 *
 * @param {LeaderboardGame[]} games
 * @param {string} genre
 * @returns {(LeaderboardGame & { rank: number | null })[]}
 */
export function rankGames(games, genre = "all") {
    const filteredGames = genre === "all" ? games : games.filter((game) => game.genre === genre);
    const orderedGames = [...filteredGames].sort((left, right) => {
        if (left.starRating === null) {
            return right.starRating === null
                ? left.title.localeCompare(right.title, "en") || left.id - right.id
                : 1;
        }
        if (right.starRating === null) {
            return -1;
        }
        return right.starRating - left.starRating
            || left.title.localeCompare(right.title, "en")
            || left.id - right.id;
    });

    let rank = 0;
    let previousRating = null;

    return orderedGames.map((game, index) => {
        if (game.starRating === null) {
            return { ...game, rank: null };
        }

        if (game.starRating !== previousRating) {
            rank = index + 1;
            previousRating = game.starRating;
        }

        return { ...game, rank };
    });
}
