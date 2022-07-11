import { v4 } from "uuid";
export type Color = "red" | "blue" | "green" | "yellow" | "purple";
export type Privilege = 0 | 1 | 2 | 3;
export type BonusMarkerKind = "Upgrade" | "Swap" | "Place" | "Move 3" | "3 Actions" | "4 Actions";
export type Upgrade = "privilege" | "book" | "actions" | "keys" | "bank";
/**
 * Current game phase dictates the allowed player actions and action behaviours
 * - `Actions` is the regular phase where player actions are expected
 * - `Displacement` requires the current player to place displaced markers
 * - `Markers` requires that the current player places a bonus marker on a route
 * - `Collection` requires that the current player "collects" their tokens to be moved
 * - `Movement` requires that the current player "places" their collected tokens
 * - `Route` requires that the current player picks a reward for completing a route
 */
export type Phase = "Actions" | "Displacement" | "Markers" | "Collection" | "Movement" | "Route";

export type ActionName =
  | "income" // Move tokens from the general stock to the personal supply
  | "done" // Explicitly end your turn
  | "place" // Regular placement of a merchant / tradesman
  | "displace" // Displace an opponent's token
  | "displace-place" // Place your displaced token + the extra ones
  | "move-collect" // Collect tokens for the move action
  | "move-place" // Place collected tokens for the move action
  | "route" // Complete a route (this is a half-action)
  | "route-empty" // Complete a route and do nothing
  | "route-office" // Complete a route and place an office in a city
  | "route-upgrade"; // Complete a route and upgrade a stat

export type ActionParams<T extends ActionName> = T extends "place" | "displace"
  ? { post: [number, number]; merch?: boolean }
  : T extends "displace-place" | "move-collect" | "move-place"
  ? { post: [number, number] }
  : T extends "route"
  ? { route: number }
  : T extends "route-empty"
  ? {}
  : T extends "route-office"
  ? { city: string }
  : T extends "route-upgrade"
  ? { upgrade: Upgrade }
  : never;

export type Action = <T extends ActionName>(name: T, params?: ActionParams<T>) => void;

export type ActionRecord<T extends ActionName> = { name: T; params?: ActionParams<T> };

export type RouteReward =
  | { title: string; action: ActionRecord<"route-empty"> }
  | { title: string; action: ActionRecord<"route-office"> }
  | { title: string; action: ActionRecord<"route-upgrade"> };

export type Office = {
  color: Privilege;
  merch?: boolean;
  point?: boolean;
};

export type City = {
  name: string;
  offices: Office[];
  position: [number, number];
  upgrade?: Upgrade;
};

export type Route = {
  from: string;
  to: string;
  posts: number;
  tavern?: boolean;
};

export type GameMap = {
  cities: { [key: string]: City };
  routes: Route[];
};

export type TokenState = {
  owner: number;
  merch?: boolean;
};

export type RouteState = {
  tokens: (TokenState | null)[];
  marker?: BonusMarkerKind;
};

export type CityState = {
  tokens: TokenState[];
  extras: TokenState[];
};

/**
 * The current player state keeps temporary information
 * about the player currently taking actions
 */
export type PhaseState = {
  // Current phase
  phase: Phase;

  // Current player index
  player: number;

  // Actions taken so far in this particular phase
  actions: ActionRecord<ActionName>[];

  // Tokens held in hand (not anywhere on the board)
  hand: ("m" | "t")[];

  // Route reward options, valid only when in the "Route" phase
  rewards?: RouteReward[];

  // Stores the previous phase state that we can return to.
  // This is done for off-turn change of control such as when placing displaced tokens
  prev?: PhaseState;
};

export type PlayerState = {
  id: string;
  name: string;
  color: Color;
  generalStock: { m: number; t: number };
  personalSupply: { m: number; t: number };
  keys: number;
  privilege: number;
  actions: number;
  bank: number;
  book: number;
  points: number;
  readyMarkers: BonusMarkerKind[];
  usedMarkers: BonusMarkerKind[];
  unplacedMarkers: BonusMarkerKind[];
};

export type GameState = {
  /**
   * The Game ID
   */
  id: string;

  /**
   * Game turn (cumulative)
   */
  turn: number;

  /**
   * Current player index
   */
  current: PhaseState;

  /**
   * Player order and states
   */
  players: PlayerState[];

  /**
   * Cities' states. In the same order as the map definition
   */
  cities: { [key: string]: CityState };

  /**
   * Trade routes states, in the same order as the map definition
   */
  routes: RouteState[];

  /**
   * Player index or `null` if the barrel is unoccupied
   */
  coellen: [number | null, number | null, number | null, number | null];

  /**
   * The map we're playing
   */
  map: GameMap;
};

import { DevMap } from "./maps";

export const initMapState = (map: GameMap): Pick<GameState, "cities" | "routes"> => ({
  cities: Object.fromEntries(Object.entries(map.cities).map(([name, _data]) => [name, { tokens: [], extras: [] }])),
  routes: map.routes.map((r) => ({ tokens: Array.from(Array(r.posts)).map(() => null) })),
});

const shuffle = <T>(array: T[]) => {
  for (let i = array.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

export const initGameState = (players: { [key in Color]?: string }): GameState => {
  return {
    id: v4(),
    turn: 0,
    current: {
      phase: "Actions",
      player: 0,
      actions: [],
      hand: [],
    },
    players: shuffle(
      (Object.keys(players) as Color[]).map((color) => ({
        id: v4(),
        color,
        name: players[color]!,
        generalStock: { m: 0, t: 7 },
        personalSupply: { m: 1, t: 4 },
        keys: 1,
        privilege: 1,
        actions: 1,
        bank: 1,
        book: 1,
        points: 0,
        readyMarkers: [],
        usedMarkers: [],
        unplacedMarkers: [],
      }))
    ),
    coellen: [null, null, null, null],
    map: DevMap,
    ...initMapState(DevMap),
  };
};
