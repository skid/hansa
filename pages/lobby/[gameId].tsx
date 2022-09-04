import Link from "next/link";
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

      <p>
        This implementation has NO SECURITY whatsoever. A cheater can modify the game state, and even crash it for
        everyone. You definitely shouldn't play the world Hansa Teutonica championship here :)
      </p>

      <h2>How to play</h2>
      <ul>
        <li>Right-click drag to pan the map</li>
        <li>Mousewheel to zoom the map</li>
        <li>Click on a trading post to place a tradesman</li>
        <li>Shift-Click for merchants</li>
        <li>Clicking an opponenet's token will attempt to displace it. You can't undo this.</li>
        <li>Click on your tokens to collect, then click on empty trading posts to place them (move action)</li>
        <li>Top-left panel with buttons offers the rest of the actions</li>
        <li>Click "reset turn" to roll back all actions until the last time another player made a move</li>
        <li>End turn passes control to next player. You can't undo this.</li>
      </ul>

      <p>Share these links to others so you can play.</p>
      <p>Keep the link to this lobby, because if you lose it you won't be able to come back to the game.</p>

      {state?.players.map((p) => (
        <div key={p.id} className="player-link">
          <Link href={`${location.protocol}//${location.host}/play/${state.id}/${p.id}`}>
            <a target="_blank">
              {p.name}, {p.color}
            </a>
          </Link>
          <div>
            {location.protocol}//{location.host}/play/{state.id}/{p.id}
          </div>
        </div>
      ))}
    </div>
  );
}

export default HomePage;
