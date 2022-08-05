import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { GameState } from "~src/game/model";
import { supabase } from "~src/supabase";

function HomePage() {
  const router = useRouter();
  const [state, setState] = useState<GameState>();

  useEffect(() => {
    if (!router.query.gameId) {
      return;
    }
    supabase
      .from("games")
      .select("state")
      .eq("id", router.query.gameId)
      .then(({ data, error }) => {
        if (error) {
          console.log(error);
        } else {
          setState(JSON.parse(data[0].state));
        }
      });
  }, [router.query.gameId]);

  return (
    <div className="center">
      <h1>Hansa Teutonica </h1>
      <p>Game {state?.id} </p>
      <p>Share these links to others so you can play.</p>

      {state?.players.map((p) => (
        <div key={p.id} className="player-link">
          {p.name}, {p.color}
          <div>
            {location.protocol}//{location.host}/play/{state.id}/{p.id}
          </div>
        </div>
      ))}
    </div>
  );
}

export default HomePage;
