import produce from "immer";
import { useCallback, useEffect, useState } from "react";
import { Action, GameState } from "./model";
import { executeAction } from "./actions";
import { getPlayer, validateAction } from "./helpers";
import { supabase } from "../supabase";

export type GameController = {
  playerId: string;
  state: GameState;
  action: Action;
  reset: () => void;
};

/**
 * Creates a new game client.
 */
export const useController = (gameId: string, playerId: string): GameController | null => {
  const [originalState, setOriginalState] = useState<GameState>();
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
            const game = JSON.parse(data[0].state);
            setState(game);
            setOriginalState(game);
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
          setOriginalState(update.new.state);
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

  // The sync method saves the game state.
  // Sync also commits actions to the game log and undo is no longer possible afterwards.
  const sync = useCallback((state: GameState) => {
    supabase
      .from("games")
      .update({ state: JSON.stringify(state) })
      .eq("id", state.id)
      .then(({ error }) => {
        if (error) {
          console.log(error);
        }
        // Commit to log
        setOriginalState(state);
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
          // Apply the action changes and get the new "current" state
          // Note that `executeAction` mutates the draft state
          const context = executeAction(name, draft, params);

          // The `draft.context` should not have been mutated
          draft.context.actions.push({ name, params });

          if (draft.context.prev === context) {
            // We are popping out of current context, store the actions
            context.actions[context.actions.length - 1].contextActions = draft.context.actions;
          }

          // Replace the `current` state with the new one
          draft.context = context;
        });

        if (newState?.context.player !== immutableState?.context.player) {
          sync(JSON.parse(JSON.stringify(newState)));
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
    reset: () => {
      setState(originalState);
    },
  };
};

export const defaultController: GameController = Object.freeze({
  playerId: "",
  state: {} as any,
  action: () => {
    throw new Error("Can't use default controller, please instantiate a new one!");
  },
  reset: () => {},
});
