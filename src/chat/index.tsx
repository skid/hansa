import { supabase } from "../supabase";
import { definitions } from "../../types/supabase";
import { FormEventHandler, useEffect, useState } from "react";
import { useClient } from "~src/game/client";
import { getPlayer } from "~src/game/helpers";

type Message = {
  id: string;
  content: string;
  playerName: string;
  createdAt: string;
  gameId: string;
};

export const Chat = ({
  gameId,
  playerId,
}: {
  gameId: string;
  playerId: string;
}) => {
  const [text, setText] = useState("");
  const client = useClient(gameId, playerId);
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    if (!gameId) {
      return;
    }

    supabase
      .from<definitions["messages"]>("messages")
      .select()
      .eq("gameId", gameId)
      .order("createdAt")
      .then(({ data, error }) => {
        if (error) {
          console.log(error);
        } else {
          setMessages(data);
        }
      });
  }, [gameId]);

  // this useEffect needs to resubscribe after each message because it holds a reference to older array of messages
  useEffect(() => {
    if (!gameId) {
      return;
    }

    const sub = supabase
      .from<definitions["messages"]>(`messages:gameId=eq.${gameId}`)
      .on("INSERT", (payload) => {
        const ms = [...messages, payload.new];
        ms.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        setMessages(ms);
      })
      .subscribe();
    return () => {
      supabase.removeSubscription(sub);
    };
  }, [messages.length, gameId]);

  if (!client) {
    return null;
  }

  const currentPlayer = client.state.players.find((p) => p.id === playerId)!;

  const onSubmit: FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();

    const { data, error } = await supabase
      .from<definitions["messages"]>("messages")
      .insert({
        content: text,
        playerName: currentPlayer.name,
        gameId,
      });
    setText("");
  };

  return (
    <div style={{ position: "absolute", right: "0", bottom: 0 }}>
      <div style={{ height: "160px", backgroundColor: "gray" }}>
        {messages.map((m) => (
          <div key={m.id}>
            {m.playerName}: {m.content}
          </div>
        ))}
      </div>
      <form
        style={{ display: "flex", flexDirection: "row" }}
        onSubmit={onSubmit}
      >
        <input value={text} onChange={(e) => setText(e.target.value)} />
        <button type="submit">Submit</button>
      </form>
    </div>
  );
};
