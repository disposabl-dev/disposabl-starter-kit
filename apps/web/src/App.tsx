import { useState } from "react";
import { Button } from "disposabl-kit/components/ui/button";

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <main className="grid min-h-svh place-items-center">
      <Button type="button" onClick={() => setCount((count) => count + 1)}>
        Count: {count}
      </Button>
    </main>
  );
}
