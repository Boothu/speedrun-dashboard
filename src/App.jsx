// Allows for storing and updating state in a component
import { useState } from "react";

// App component is what returns the UI
function App() {
  // useState lets this component have state (memory)
  // Make a state variable 'query' and a setter 'setQuery'
  // Calling 'setQuery(...)' updates 'query' and tells React to re-render the UI
  const [query, setQuery] = useState("");
  return (
    <main className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Speedrun Records Dashboard</h1>

      <div className="flex gap-2 mb-4">
        <input
          className="flex-1 border rounded px-3 py-2"
          placeholder="Search for a game"
          value={query}
          // Update 'query' with entered text
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={() => {
            const trimmed = query.trim();
            // If nothing is entered return early
            if (!trimmed) return;
            // Placeholder for now
            console.log("Searching for:", trimmed);
          }}
        >
          Search
        </button>
      </div>
    </main>
  );
}

export default App