import { ActionName, ActionParams, ActionRecord, GameState, Phase, Route, RouteState, Upgrade } from "./model";

/**
 * Performs the calback a number of times and returns an array
 */
export const times = <T>(times: number, callback: (i: number) => T) => {
  return Array.from(Array(times)).map((_, i) => callback(i));
};

/**
 * Returns the player who's in turn
 */
export const getPlayer = (s: GameState) => s.players[s.current.player];

/**
 * Returns a trading post
 */
export const getPost = (s: GameState, post: [number, number]) => s.routes[post[0]].tokens[post[1]];

/**
 * Returns the number tokens a player moves with an income action
 */
export const incomeValue = (s: GameState) => {
  const player = getPlayer(s);
  switch (player.bank) {
    case 1:
      return 3;
    case 2:
      return 5;
    case 3:
      return 7;
    case 4:
      return 100; // You can never have more than 100 tokens
    default:
      throw new Error(`Invalid bank value ${player.bank}`);
  }
};

/**
 * Returns true if a player can apply given upgrade
 */
export const canUpgrade = (s: GameState, upgrade: Upgrade) => {
  const player = getPlayer(s);
  switch (upgrade) {
    case "actions":
      return player.actions < 6;
    case "bank":
      return player.bank < 4;
    case "book":
      return player.book < 4;
    case "privilege":
      return player.privilege < 4;
    case "keys":
      return player.keys < 5;
    default:
      throw new Error(`Invalid upgrade ${upgrade}`);
  }
};

/**
 * Returns the number of actions a player has at disposal
 */
export const availableActionsCount = (s: GameState) => {
  const { actions, book, unplacedMarkers } = getPlayer(s);

  if (s.current.phase === "Actions") {
    return actions <= 1 ? 2 : actions <= 3 ? 3 : actions <= 5 ? 4 : 5;
  } else if (s.current.phase === "Displacement") {
    const { actions, hand } = s.current;
    const merchDisplaced = hand.length
      ? hand[0] === "m"
      : getPost(s, (actions[0] as ActionRecord<"displace-place">).params!.post)?.merch;
    return merchDisplaced ? 3 : 2;
  } else if (s.current.phase === "Collection") {
    // Books allow you to move 2/3/4/5 tokens
    return book + 1;
  } else if (s.current.phase === "Movement") {
    // The hand is emptied with actions
    return s.current.hand.length + s.current.actions.length;
  } else if (s.current.phase === "Markers") {
    return unplacedMarkers.length;
  }

  return 0;
};

/**
 * Returns all neighboring routes to a set of routes, but not the routes themselves.
 */
export const neighboringRoutes = (s: GameState, routeIndices: number[]) => {
  const cities = new Set(routeIndices.flatMap((i) => [s.map.routes[i].from, s.map.routes[i].to]));
  return s.map.routes.reduce((acc, r, i) => {
    if (!routeIndices.includes(i) && (cities.has(r.from) || cities.has(r.to))) {
      return [...acc, i];
    }
    return acc;
  }, [] as number[]);
};

/**
 * Counts the number of vacant trading posts in a set of routes
 */
export const vacantPostsCount = (s: GameState, routeIndices: number[]) => {
  let sum = 0;
  for (const i of routeIndices) {
    const route = s.routes[i];
    sum += route.tokens.reduce((acc, token) => acc + (token ? 0 : 1), 0);
  }
  return sum;
};

/**
 * Returns the indices of all routes where a displaced token might be placed
 */
export const validDisplacedTokenRoutes = (s: GameState) => {
  const act = s.current.prev!.actions[s.current.prev!.actions.length - 1] as ActionRecord<"displace">;
  const location = act.params!.post;

  let traversed = [location[0]];
  let neighbors = neighboringRoutes(s, traversed);
  while (vacantPostsCount(s, neighbors) === 0) {
    traversed = [...traversed, ...neighbors];
    neighbors = neighboringRoutes(s, traversed);
  }
  return neighbors;
};

/**
 * Returns routes controlled by a player that pass a certain predicate
 */
export const findRoutes = (
  s: GameState,
  routeTest: (r: Route) => boolean = () => true,
  stateTest: (r: RouteState) => boolean = () => true
) => {
  let i = 0;
  const result: number[] = [];
  for (const route of s.map.routes) {
    if (routeTest(route) && stateTest(s.routes[i])) {
      result.push(i);
    }
    i += 1;
  }
  return result;
};

/**
 * Returns the city owner.
 * If nobody owns it, returns -1;
 */
export const cityOwner = (s: GameState, cityName: string) => {
  const c = s.cities[cityName];

  let owner = -1;
  let counts = s.players.map((_) => 0);
  for (const t of [...c.extras, ...c.tokens]) {
    counts[t.owner] += 1;
    if (t.owner !== owner && counts[t.owner] >= (counts[owner] || 0)) {
      owner = t.owner;
    }
  }

  return owner;
};

// VALIDATOR FUNCTIONS

const noMoreTokens = (s: GameState) => {
  const { generalStock, personalSupply } = getPlayer(s);
  return generalStock.m + generalStock.t + personalSupply.m + personalSupply.t === 0 ? "You have no more tokens" : null;
};

const noActionsRemaining = (s: GameState) =>
  availableActionsCount(s) === s.current.actions.length ? "No actions remaining" : null;

const insufficientReadyTokens = (s: GameState, amount: number, merch?: boolean) => {
  const { m, t } = getPlayer(s).personalSupply;
  return (merch === undefined ? m + t : merch ? m : t) < amount
    ? `Not enough ${merch ? "merchants" : "tradesmen"}`
    : null;
};

const gamePhaseIsNot = (s: GameState, p: Phase[]) =>
  p.includes(s.current.phase) ? null : "You can't perform that action now";

const generalStockEmpty = (s: GameState) =>
  getPlayer(s).generalStock.m + getPlayer(s).generalStock.t < 1 ? "General Stock is Empty" : null;

const tradingPostTaken = (s: GameState, post: [number, number]) => (getPost(s, post) ? "Trading Post is Taken" : null);

const tradingPostEmpty = (s: GameState, post: [number, number]) => (!getPost(s, post) ? "Trading Post is Empty" : null);

const routeIsNotComplete = (s: GameState, routeIndex: number) =>
  s.routes[routeIndex].tokens.some((t) => t?.owner !== s.current.player) ? "The route is not complete" : null;

const cityIsFull = (s: GameState, cityName: string) => {
  return s.cities[cityName].tokens.length === s.map.cities[cityName].offices.length ? "City is full" : null;
};

const insufficientPrivilegeForCity = (s: GameState, cityName: string) => {
  const { privilege } = getPlayer(s);
  return s.map.cities[cityName].offices[s.cities[cityName].tokens.length]?.color > privilege
    ? "Insufficient privilege to claim this city"
    : null;
};

const noMerchantToken = (s: GameState, cityName: string) => {
  const requiresMerch = s.map.cities[cityName].offices[s.cities[cityName].tokens.length]?.merch;
  if (requiresMerch && s.current.hand.every((t) => t === "t")) {
    return "A merchant is required to claim that office";
  }
  return null;
};

const tradingPostOwn = (s: GameState, post: [number, number]) =>
  getPost(s, post)!.owner === s.current.player ? "Trading Post is Yours" : null;

const tradingPostNotOwn = (s: GameState, post: [number, number]) =>
  getPost(s, post)!.owner !== s.current.player ? "Trading Post is not Yours" : null;

const invalidDisplaceRoute = (s: GameState, post: [number, number]) =>
  !validDisplacedTokenRoutes(s).includes(post[0]) ? "You can't move a displaced token there" : null;

/**
 * Validates an action and returns an error message if it fails, otherwise null
 */
export const validateAction = <T extends ActionName>(name: T, s: GameState, params?: ActionParams<T>) => {
  if (name === "place") {
    const { merch, post } = params as ActionParams<"place">;
    return (
      gamePhaseIsNot(s, ["Actions"]) ||
      noActionsRemaining(s) ||
      insufficientReadyTokens(s, 1, merch) ||
      tradingPostTaken(s, post)
    );
  } else if (name === "income") {
    return gamePhaseIsNot(s, ["Actions"]) || noActionsRemaining(s) || generalStockEmpty(s);
  } else if (name === "displace") {
    const { merch, post } = params as ActionParams<"displace">;
    return (
      gamePhaseIsNot(s, ["Actions"]) ||
      noActionsRemaining(s) ||
      tradingPostEmpty(s, post) ||
      tradingPostOwn(s, post) ||
      insufficientReadyTokens(s, 1, merch) ||
      insufficientReadyTokens(s, 1 + (getPost(s, post)!.merch ? 2 : 1))
    );
  } else if (name === "displace-place") {
    const { post } = params as ActionParams<"displace-place">;
    return (
      gamePhaseIsNot(s, ["Displacement"]) ||
      noActionsRemaining(s) ||
      invalidDisplaceRoute(s, post) ||
      tradingPostTaken(s, post) ||
      noMoreTokens(s)
    );
  } else if (name === "move-collect") {
    const { post } = params as ActionParams<"move-collect">;
    return (
      gamePhaseIsNot(s, ["Actions", "Collection"]) ||
      noActionsRemaining(s) ||
      tradingPostEmpty(s, post) ||
      tradingPostNotOwn(s, post)
    );
  } else if (name === "move-place") {
    const { post } = params as ActionParams<"move-place">;
    return (
      gamePhaseIsNot(s, ["Collection", "Movement"]) ||
      (s.current.phase === "Movement" ? noActionsRemaining(s) : null) ||
      tradingPostTaken(s, post)
    );
  } else if (name === "route") {
    const { route } = params as ActionParams<"route">;
    return gamePhaseIsNot(s, ["Actions"]) || noActionsRemaining(s) || routeIsNotComplete(s, route);
  } else if (name === "route-office") {
    const { city } = params as ActionParams<"route-office">;
    return (
      gamePhaseIsNot(s, ["Route"]) ||
      cityIsFull(s, city) ||
      insufficientPrivilegeForCity(s, city) ||
      noMerchantToken(s, city)
    );
  } else if (name === "done") {
    // TODO: validate
  }

  return null;
};
