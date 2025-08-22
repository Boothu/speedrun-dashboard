// Allows for storing and updating state in a component
import { useState } from "react";

// App component is what returns the UI
function App() {
  // useState lets this component have state (memory)
  // Make a state variable 'query' and a setter 'setQuery'
  // Calling 'setQuery(...)' updates 'query' and tells React to re-render the UI
  const [query, setQuery] = useState("");
  return (
    <main>
      <h1>Speedrun Records Dashboard</h1>

      <div>
        <input
          placeholder="Search for a game"
          value={query}
          // Update 'query' with entered text
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
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