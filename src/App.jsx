// Allows for storing and updating state in a component
import { useState, useEffect } from "react";

// App component is what returns the UI
function App() {
  // STATE VARIABLES
  // useState lets this component have state (memory)
  // Make a state variable 'query' and a setter 'setQuery'
  // Calling 'setQuery(...)' updates 'query' and tells React to re-render the UI
  const [query, setQuery] = useState("");

  // Holds the array of results from the API
  const [games, setGames] = useState([]);

  // Will be true while waiting for the server
  const [loading, setLoading] = useState(false);

  // Set to error message if something goes wrong
  const [error, setError] = useState("");

  // Track if a search has been performed
  const [hasSearched, setHasSearched] = useState(false);

  // Track game selected from list generated after search
  const [selectedGame, setSelectedGame] = useState(null);

  // Track a games categories, the selected category and if categories are loading
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  // State for leaderboard
  const [leaderboard, setLeaderboard] = useState([]);
  const [lbLoading, setLbLoading] = useState(false);




  // FUNCTIONS
  // Fetch games from speedrun.com based on current 'query'
  async function handleSearch() {
    const q = query.trim();
    // If nothing is entered return early
    if (!q) return;

    setLoading(true);
    setHasSearched(true);
    // Clear anything that may remain from previous searches
    setError("");
    setGames([]);
    setSelectedGame(null);
    setCategories([]);
    setSelectedCategory(null);
    setCategoriesLoading(false);
    setLeaderboard([]);
    setLbLoading(false);

    try {
      // Use entered query ('q') in search using the API
      // 'encodeURIComponent' handles spaces and special characters
      // Limit to 10 results
      const url = `https://www.speedrun.com/api/v1/games?name=${encodeURIComponent(q)}&max=10`;

      // Make request to API
      const response = await fetch(url);

      // Most common error - log a message specifically for it
      if (response.status === 420) {
        throw new Error("Too many requests - please wait a moment before searching again.");
      }
      // Throw error if request unsuccessful
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status} ${response.statusText}`);
      }

      // Get response data in JSON form
      const json = await response.json();

      // Speedrun.com returns the list under 'data'
      const results = json.data;

      // Update games array
      setGames(results);
    } catch (e) {
      console.error(e);
      setError(`Failed to fetch games: ${e.message}`);
      // Stop loading as search has finished
    } finally {
      setLoading(false);
    }
  }


  // useEffect is used so any time selectedGame or selectedCategory changes, all this code inside it will run
  useEffect(() => {
    // Ensure both a game and category have been selected - else return
    if (!selectedGame || !selectedCategory) {
      setLeaderboard([]);
      setLbLoading(false);
      return;
    }

    // Fetch leaderboard based on current 'selectedCategory'
    async function getLeaderboard() {
      setLbLoading(true);
      setLeaderboard([]);

      try {
        const url = `https://www.speedrun.com/api/v1/leaderboards/${selectedGame.id}/category/${selectedCategory.id}?top=10&embed=players`;
        const response = await fetch(url);
        // Throw error if request unsuccessful
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status} ${response.statusText}`);
        }
        const json = await response.json();

        // Ensure there is data for runs and players
        const runs = (json.data && json.data.runs) ? json.data.runs : [];
        const embeddedPlayers = (json.data && json.data.players && json.data.players.data) ? json.data.players.data : [];

        // Helper to find a players display name in the embedded array - guards in place incase data is missing
        function getPlayerName(p) {
          if (!p) return "Unknown";
          if (p.rel === "guest") return p.name || "Guest";
          if (p.rel === "user") {
            const match = embeddedPlayers.find(x => x.id === p.id);
            return (match && (match.names?.international || match.name)) || "User";
          }
          return "Unknown";
        }

        // Map data into rows
        const rows = runs.map((r) => {
          const place = r.place;
          const run = r.run;
          const first = run && run.players ? run.players[0] : null;
          const runner = getPlayerName(first);
          const seconds = (run && run.times) ? run.times.primary_t : null;
          const date = run ? run.date : "";
          const video = (run && run.videos && run.videos.links && run.videos.links[0]) ? run.videos.links[0].uri : (run ? run.weblink : "");

          return { place, runner, seconds, date, video };
        });
        setLeaderboard(rows);
      } catch (e) {
        console.error(e);
        setError(`Failed to fetch leaderboard: ${e.message}`);
      } finally {
        setLbLoading(false);
      }
    }
    // Now actually run 'getLeaderboard' with current selected game and category
    getLeaderboard();
  }, [selectedGame, selectedCategory]);


  // Helper function to convert time from seconds to (HH:)MM:SS
  function formatTime(seconds) {
    if (!seconds) return "No time recorded";
    // Calculate hours/mins/seconds and floor to get whole numbers
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    // If run is long enough to include hours include HH:
    if (hrs > 0) {
      // 'padStart' is used to add a leading 0 (e.g. 1:5:3 becomes 1:05:03)
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
    } else {
      return `${mins}:${secs.toString().padStart(2, "0")}`;
    }
  }




  // JSX / UI
  return (
    <main className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Speedrun Records Dashboard</h1>

      <div className="flex gap-2 mb-4">
        {/* INPUT BOX */}
        <input
          className="flex-1 border rounded px-3 py-2"
          placeholder="Search for a game"
          value={query}
          // Update 'query' with entered text
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSearch();
            }
          }}
        />

        {/* SEARCH BUTTON */}
        {/* Calls handle search on click, disabled while loading */}
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60"
          onClick={handleSearch}
          disabled={loading}
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      {/* ERROR MESSAGES */}
      {/* If 'error' is truthy then display error message */}
      {error && <div className="mb-3 text-red-600">{error}</div>}
      {/* If search is complete and no games found, display message */}
      {!loading && !error && games.length === 0 && hasSearched && (
        <p className="mb-3 text-gray-600">
          No games found. Try a different search.
        </p>
      )}

      {/* GAMES LIST */}
      <ul className="space-y-2">
        {/* Map each game in the games array to its own box showing name and release date */}
        {games.map((game) => (
          <li key={game.id} className="border rounded">
            {/* If game is clicked, set it as selected game and load categories */}

            {/* GAME */}
            <button
              className={"w-full text-left p-3 hover:bg-gray-200 rounded"}
              onClick={async () => {
                // If user clicks a game after already selecting it, it will be deselected
                if (selectedGame?.id === game.id) {
                  setSelectedGame(null);
                  setCategories([]);
                  setSelectedCategory(null);
                  return;
                }
                setCategories([]);
                setLeaderboard([]);
                setLbLoading(false);
                setSelectedCategory(null);
                setSelectedGame(game);

                // Fetch categories
                setCategoriesLoading(true);
                try {
                  const response = await fetch(`https://www.speedrun.com/api/v1/games/${game.id}/categories?type=per-game`);
                  // Throw error if request unsuccessful
                  if (!response.ok) {
                    throw new Error(`Request failed with status ${response.status} ${response.statusText}`);
                  }
                  const json = await response.json();
                  // Filter out per-level categories
                  setCategories((json.data || []).filter(c => c.type === "per-game"));
                  setSelectedCategory(null);
                } catch (e) {
                  console.error(e);
                  setError(`Failed to fetch categories: ${e.message}`);
                  setCategories([]);
                } finally {
                  setCategoriesLoading(false);
                }
              }}
            >
              <div className="font-medium">{game.names?.international}</div>
              <div className="text-sm text-gray-600">
                Released: {game.released ?? "n/a"}
              </div>
            </button>

            {/* CATEGORIES DISPLAY */}
            {/* If this game is selected, show its categories and let them be selected */}
            {selectedGame?.id === game.id && (
              <div className="p-3 flex flex-wrap gap-2 border-t">
                {/* Display categories loading text */}
                {categoriesLoading && <p className="text-sm text-gray-600">Loading categories...</p>}
                {/* Show message if there are no categories */}
                {!categoriesLoading && categories.length === 0 && (
                  <p className="text-sm text-gray-600">
                    No categories found for this game.
                  </p>
                )}
                {/* When finished loading display categories */}
                {!categoriesLoading && categories.length > 0 &&
                  categories.map((c) => (
                    <button
                      key={c.id}
                      className={`px-3 py-1 border rounded text-sm ${selectedCategory?.id === c.id ? "bg-blue-500 text-white hover:bg-blue-600" : "hover:bg-gray-200"}`}
                      onClick={() => setSelectedCategory(c)}
                    >
                      {c.name}
                    </button>
                  ))}
              </div>
            )}

            {/* LEADERBOARD DISPLAY */}
            {/* Only display in selected games box & ensure category has been selected */}
            {selectedGame?.id === game.id && selectedCategory && (
              <div className="p-3 border-t">
                <h3 className="font-semibold mb-2">
                  Leaderboard: {selectedCategory.name}
                </h3>

                {lbLoading && <p className="text-sm text-gray-600">Loading leaderboard...</p>}

                {/* If finished loading and there are no errors display leaderboard */}
                {!lbLoading && !error && leaderboard.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left border-b">
                          <th className="py-2 pr-3">Place</th>
                          <th className="py-2 pr-3">Runner</th>
                          <th className="py-2 pr-3">Time (s)</th>
                          <th className="py-2 pr-3">Date</th>
                          <th className="py-2 pr-3">Link</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Map data to respective row */}
                        {leaderboard.map((row, i) => (
                          <tr key={i} className="border-b last:border-0">
                            <td className="py-2 pr-3">{i + 1}</td>
                            <td className="py-2 pr-3">{row.runner}</td>
                            <td className="py-2 pr-3">{formatTime(row.seconds)}</td>
                            <td className="py-2 pr-3">{row.date || ""}</td>
                            <td className="py-2 pr-3">
                              {row.video ? (
                                <a
                                  className="text-blue-600 hover:underline"
                                  href={row.video}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Video
                                </a>
                              ) : (
                                ""
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {!lbLoading && !error && leaderboard.length === 0 && (
                  <p className="text-sm text-gray-600">No leaderboard entries found.</p>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}

export default App