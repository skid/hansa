import { useRouter } from "next/router";
import { useState } from "react";
import { Color, initGameState } from "~src/game/model";
import { supabase } from "../src/supabase";

function HomePage() {
  const router = useRouter();
  const [players, setPlayers] = useState<{ [key in Color]?: string }>({});
  const count = Object.values(players).filter((v) => v.trim()).length;

  const createGame = async () => {
    const pls = { ...players };
    for (const color of Object.keys(pls) as Color[]) {
      pls[color] = (pls[color] || "").trim();
      if (!pls[color]) {
        delete pls[color];
      }
    }

    if (Object.keys(pls).length < 3) {
      return;
    }

    const game = initGameState(pls);
    const { data, error } = await supabase.from("games").upsert([
      {
        id: game.id,
        state: JSON.stringify(game),
      },
    ]);

    if (error) {
      console.log(error);
    } else {
      router.push(`/lobby/${data[0].id}`);
    }
  };

  return (
    <div className="center">
      <h1>Hansa Teutonica Online</h1>
      <p>To create a new game, enter the names of at least 3 players.</p>

      <div className="player-conf">
        <span>Red</span>
        <input
          maxLength={8}
          value={players.red || ""}
          onChange={(e) => setPlayers({ ...players, red: e.currentTarget.value })}
        />
      </div>
      <div className="player-conf">
        <span>Blue</span>
        <input
          maxLength={8}
          value={players.blue || ""}
          onChange={(e) => setPlayers({ ...players, blue: e.currentTarget.value })}
        />
      </div>
      <div className="player-conf">
        <span>Green</span>
        <input
          maxLength={8}
          value={players.green || ""}
          onChange={(e) => setPlayers({ ...players, green: e.currentTarget.value })}
        />
      </div>
      <div className="player-conf">
        <span>Yellow</span>
        <input
          maxLength={8}
          value={players.yellow || ""}
          onChange={(e) => setPlayers({ ...players, yellow: e.currentTarget.value })}
        />
      </div>
      <div className="player-conf">
        <span>Purple</span>
        <input
          maxLength={8}
          value={players.purple || ""}
          onChange={(e) => setPlayers({ ...players, purple: e.currentTarget.value })}
        />
      </div>
      <div>
        <br />
        {count > 2 && <button onClick={createGame}>Create a {count}-player game</button>}
      </div>
      <h2>Report bugs here</h2>
      <a href="https://github.com/skid/hansa">https://github.com/skid/hansa</a>
    </div>
  );
}

export default HomePage;
