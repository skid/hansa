import { v4 } from "uuid";
export type Color = "red" | "blue" | "green" | "yellow" | "purple";
export type Privilege = 0 | 1 | 2 | 3;
export type Upgrade = "privilege" | "book" | "actions" | "keys" | "bank";
export type BonusMarkerKind = "Upgrade" | "Swap" | "Office" | "Move 3" | "3 Actions" | "4 Actions";

/**
 * Current game phase dictates the allowed player actions and action behaviours
 */
export type Phase =
  | "Actions" // regular phase where player actions are expected
  | "Displacement" // current player must place displaced markers
  | "Markers" // current player places a bonus marker on a route
  | "Collection" // current player collects tokens from trading posts to be moved
  | "Movement" // current player places collected tokens
  | "Route" // current player picks a reward for completing a route
  | "Upgrade" // current player picks an upgrade (after using the upgrade marker)
  | "Swap" // current player selects an office to swap (after using the swap marker)
  | "Office"; // current player picks a city to put an extra office in (after using the office marker)

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
  | "route-upgrade" // Complete a route and upgrade a stat
  | "route-barrel" // Score special coellen prestige points
  | "marker-place" // Place a new marker at the end of your turn
  | "marker-use" // Use a marker
  | "marker-swap" // Use a "swap" marker
  | "marker-office"; // Use an "extra office" marker;

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
  : T extends "route-barrel"
  ? { barrel: number }
  : T extends "marker-place"
  ? { route: number }
  : T extends "marker-use"
  ? { kind: BonusMarkerKind }
  : T extends "marker-swap"
  ? { city: string; office: number }
  : T extends "marker-office"
  ? { city: string }
  : never;

export type Action = <T extends ActionName>(name: T, params?: ActionParams<T>) => void;

export type ActionRecord<T extends ActionName> = {
  name: T;
  params?: ActionParams<T>;
  /**
   * Actions done within the new context created by this action.
   * We use this, for example, to check if the "route" action was followed by
   * a "route-office" action in the "route" phase it created.
   */
  contextActions?: ActionRecord<ActionName>[];
};

export type Reward =
  | { title: string; action: ActionRecord<"route-empty"> }
  | { title: string; action: ActionRecord<"route-office"> }
  | { title: string; action: ActionRecord<"route-upgrade"> }
  | { title: string; action: ActionRecord<"marker-office"> }
  | { title: string; action: ActionRecord<"route-barrel"> };

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
  color?: "red" | "yellow"; // For upgrade cities / arnheim-stendal route
  neighbors: string[]; // Neighboring cities (redundant, but useful for calculations)
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
  coellen: [number, number];
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
 * The phase context stores information about the current phase and
 * the actions taken in it. The phase context behaves similarly to a stack.
 * For example, if a player action needs additional choices to be displayed
 * a new context will be created and its `prev` attribute will point to the
 * original context to be restored once the player is done.
 */
export type PhaseContext = {
  // Current phase name
  phase: Phase;

  // Current player index
  player: number;

  // Actions taken so far in this phase
  actions: ActionRecord<ActionName>[];

  // Tokens held in hand (not anywhere on the board)
  hand: { token: "m" | "t"; owner: number }[];

  // Reward choices, e.g. when completing a route
  rewards?: Reward[];

  // Points to the previous context that we need to return to
  prev?: PhaseContext;

  // If true, a game end condition has been met.
  // The game should end immediately after the current action is resolved
  endGame?: boolean;
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
  linkEastWest?: true;
};

export type LogEntry = {
  player: number;
  message: String;
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
   * The current "phase context".
   * Phases determine what kind of actions are possible.
   */
  context: PhaseContext;

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
   * The bonus marker stack
   */
  markers: BonusMarkerKind[];

  /**
   * Player index or `null` if the barrel is unoccupied
   */
  coellen: [number | null, number | null, number | null, number | null];

  /**
   * The map we're playing
   */
  map: GameMap;

  /**
   * The game log, displayed to the user
   */
  log: LogEntry[];

  /**
   * True if the game is over
   */
  isOver: boolean;
};

import { Standard3P, Standard4P } from "./maps";

const shuffle = <T>(array: T[]) => {
  for (let i = array.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

export const initMapState = (map: GameMap): Pick<GameState, "cities" | "routes"> => {
  const markers: BonusMarkerKind[] = shuffle(["Swap", "Move 3", "Office"]);
  return {
    cities: Object.fromEntries(Object.entries(map.cities).map(([name, _data]) => [name, { tokens: [], extras: [] }])),
    routes: map.routes.map((r) => ({
      tokens: Array.from(Array(r.posts)).map(() => null),
      marker: r.tavern ? markers.shift() : undefined,
    })),
  };
};

export const initGameState = (players: { [key in Color]?: string }): GameState => {
  const map = Object.keys(players).length > 3 ? Standard4P : Standard3P;
  return {
    id: v4(),
    turn: 0,
    context: {
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
        // readyMarkers: ["Upgrade", "Swap", "3 Actions", "Office", "4 Actions", "Move 3"],
        usedMarkers: [],
        unplacedMarkers: [],
      }))
    ),
    markers: [
      "Office",
      "Office",
      "Office",
      "Office",
      "4 Actions",
      "4 Actions",
      "3 Actions",
      "3 Actions",
      "Upgrade",
      "Upgrade",
      "Swap",
      "Swap",
      "Move 3",
    ],
    coellen: [null, null, null, null],
    log: [{ player: -1, message: "A new game begins!" }],
    isOver: false,
    map,
    ...initMapState(map),
  };
};
