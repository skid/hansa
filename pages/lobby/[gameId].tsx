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
      <p>Keep the link to this lobby, because if you lose it you won't be able to come back to the game.</p>

      <h2>How to play</h2>
      <ul>
        <li>Right-click drag to pan the map</li>
        <li>Mousewheel to zoom the map</li>
        <li>Click on a trading post to place a tradesman</li>
        <li>Shift-Click for merchants</li>
        <li>Open the console for gameplay error messages</li>
        <li>End turn passes control to next player. Can't undo this.</li>
        <li>Clicking an opponenet's token will attempt to displace it. Can't undo this.</li>
      </ul>

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
