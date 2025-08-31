import { useState, useEffect } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

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
    if (!seconds) return "0";
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


  // Copies and sorts leaderboard manually which fixes bug where a runner with more 
  // than 1 time in leaderboard would appear in the wrong place
  const sorted = [...leaderboard].sort((a, b) => {
    return (a.seconds) - (b.seconds);
  });




  // JSX / UI
  return (
    <main className="min-h-screen bg-gray-100 px-4">
      <div className="mx-auto max-w-2xl py-8">
        <div className="rounded-lg bg-white border p-5">
          <h1 className="text-2xl font-bold text-gray-800">
            Speedrun Records Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Search for a game and view the top speedruns
          </p>
          <br />

          <div className="mb-4 flex flex-col gap-2 sm:flex-row">
            {/* INPUT BOX */}
            <input
              className="flex-1 rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
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
              className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-60"
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
              <li key={game.id} className="rounded-md border bg-white">
                {/* If game is clicked, set it as selected game and load categories */}

                {/* GAME */}
                <button
                  className={`w-full text-left rounded-md p-3 ${selectedGame?.id === game.id ? "bg-blue-50 border-blue-400" : "hover:bg-gray-50"}`}
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
                  <div className="font-medium text-gray-800">{game.names?.international}</div>
                  <div className="text-xs text-gray-500">
                    Released: {game.released ?? "n/a"}
                  </div>
                </button>

                {/* CATEGORIES DISPLAY */}
                {/* If this game is selected, show its categories and let them be selected */}
                {selectedGame?.id === game.id && (
                  <div className="p-3 border-t">
                    <div className="flex flex-wrap gap-2">
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
                            className={`rounded-md border px-2.5 py-1 text-xs ${selectedCategory?.id === c.id
                              ? "bg-blue-500 text-white border-blue-500"
                              : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                              }`} onClick={() => setSelectedCategory(c)}
                          >
                            {c.name}
                          </button>
                        ))}
                    </div>
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
                      <div className="overflow-x-auto border rounded-md">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left bg-gray-100">
                              <th className="py-2 px-3 text-sm font-semibold text-gray-700">Place</th>
                              <th className="py-2 pr-3">Runner</th>
                              <th className="py-2 pr-3">Time</th>
                              <th className="py-2 pr-3">Date</th>
                              <th className="py-2 pr-3">Link</th>
                            </tr>
                          </thead>
                          <tbody>
                            {/* Map data to respective row */}
                            {sorted.map((row, i) => (
                              <tr key={i} className="border-t hover:bg-gray-50">
                                <td className="py-2 px-3 text-sm text-gray-800">{i + 1}</td>
                                <td className="py-2 pr-3 text-sm text-gray-800">{row.runner}</td>
                                <td className="py-2 pr-3 text-sm text-gray-800">{formatTime(row.seconds)}</td>
                                <td className="py-2 pr-3 text-sm text-gray-800">{row.date || ""}</td>
                                <td className="py-2 pr-3 text-sm text-gray-800">
                                  {row.video ? (
                                    <a
                                      className="text-blue-600 hover:underline text-sm"
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

                    {/* CHART DISPLAY */}
                    {!lbLoading && leaderboard.length > 1 && (
                      // Ensures labels all display neatly and that chart doesnt appear 
                      // squashed even when theres only a few rows
                      <div className="my-4 rounded-md border p-3 bg-white" style={{ height: `${Math.max(leaderboard.length * 37, 140)}px` }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            layout="vertical"
                            // Adding number in front of runners name will allow the chart to differentiate 
                            // between multiple runs from the same runner, ensuring the correct time is displayed
                            data={sorted.map((r, i) => ({ name: `${i + 1}. ${r.runner} `, time: r.seconds || 0 }))}>
                            <XAxis type="number" domain={[0, 'dataMax']} tickFormatter={(v) => formatTime(v)} />
                            <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 10 }} />
                            {/* Shows time when hovering over bars */}
                            <Tooltip formatter={(value) => [formatTime(value), "Time"]} />
                            <Bar dataKey="time" barSize={18} fill="#3B82F6" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}

export default App