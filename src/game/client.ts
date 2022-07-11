import produce from "immer";
import { useCallback, useEffect, useState } from "react";
import { Action, GameState, initGameState } from "./model";
import { executeAction } from "./actions";
import { getPlayer, validateAction } from "./helpers";
import { supabase } from "../supabase";

export type GameClient = {
  playerId: string;
  state: GameState;
  action: Action;
};

/**
 * Creates a new game client.
 */
export const useClient = (gameId: string, playerId: string): GameClient | null => {
  const [immutableState, setState] = useState<GameState>();

  useEffect(() => {
    if (gameId) {
      supabase
        .from("games")
        .select("state")
        .eq("id", gameId)
        .then(({ data, error }) => {
          if (error) {
            console.log(error);
          } else {
            setState(JSON.parse(data[0].state));
          }
        });
    }
  }, [gameId, playerId]);

  useEffect(() => {
    if (gameId) {
      supabase
        .from(`games:id=eq.${gameId}`)
        .on("UPDATE", (update) => {
          setState(update.new.state);
        })
        .subscribe();
      return () => {
        supabase.removeAllSubscriptions();
      };
    }
  }, [gameId]);

  if (typeof window !== "undefined") {
    (window as any).hansa = immutableState;
  }

  const sync = useCallback((state: GameState) => {
    supabase
      .from("games")
      .update({ state: JSON.stringify(state) })
      .eq("id", state.id)
      .then(({ error }) => {
        if (error) {
          console.log(error);
        }
      });
  }, []);

  const action: Action = useCallback(
    (name, params) => {
      setState((immutableState) => {
        if (getPlayer(immutableState!).id !== playerId) {
          return immutableState;
        }
        const error = validateAction(name, immutableState!, params);

        if (error) {
          console.log(error);
          return immutableState;
        }

        const newState = produce(immutableState, (draft: GameState) => {
          // Apply the action changes and get the new current state
          const current = executeAction(name, draft, params);

          // Record the action after it's been performed
          draft.current.actions.push({ name, params });
          draft.current = current;
        });

        if (newState?.current.player !== immutableState?.current.player) {
          sync(newState!);
        }

        return newState;
      });
    },
    [gameId, playerId]
  );

  if (!immutableState) {
    return null;
  }

  return {
    playerId,
    state: immutableState,
    action,
  };
};

export const defaultClient: GameClient = Object.freeze({
  playerId: "",
  state: {} as any,
  action: () => {
    throw new Error("Can't use default client, please instantiate a new one!");
  },
});
