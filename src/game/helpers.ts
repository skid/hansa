import { ActionName, ActionParams, ActionRecord, GameState, Phase, Route, RouteState, Upgrade } from "./model";

/**
 * Returns the current player
 */
export const getPlayer = (s: GameState) => s.players[s.context.player];

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
 * Returns true if a player can end their turn
 */
export const canEndTurn = (s: GameState) => {
  const { hand, phase } = s.context;

  if (hand.length > 0) {
    return false;
  }
  if (phase === "Markers" && availableActionsCount(s)) {
    return false;
  }
  if (phase === "Route" || phase === "Swap") {
    return false;
  }
  if (phase === "Displacement" && hand.length !== 0) {
    return false;
  }
  return true;
};

/**
 * Returns true if a player can move opponent tokens.
 * Normally, after a bonus marker has been played
 */
export const canMoveOponnentMarkers = (s: GameState) => {
  const last = s.context.prev?.actions[s.context.prev?.actions.length - 1];
  if (
    s.context.phase === "Collection" &&
    last &&
    last.name === "marker-use" &&
    (last.params as ActionParams<"marker-use">)?.kind === "Move 3" // FU typescript inferrence
  ) {
    return true;
  }
  return false;
};

/**
 * Returns the number of actions a player has at disposal
 */
export const availableActionsCount = (s: GameState) => {
  const { actions, book, unplacedMarkers } = getPlayer(s);

  if (s.context.phase === "Actions") {
    const regular = actions <= 1 ? 2 : actions <= 3 ? 3 : actions <= 5 ? 4 : 5;
    const playedMarkers = s.context.actions.filter(({ name }) => name === "marker-use") as ActionRecord<"marker-use">[];
    const additional = playedMarkers.reduce(
      (acc, mk) => acc + (mk.params?.kind === "3 Actions" ? 3 : mk.params?.kind === "4 Actions" ? 4 : 0),
      0
    );
    return regular + additional;
  } else if (s.context.phase === "Displacement") {
    const { actions, hand } = s.context;
    const merchDisplaced = hand.length
      ? hand[0].token === "m"
      : getPost(s, (actions[0] as ActionRecord<"displace-place">).params!.post)?.merch;
    return merchDisplaced ? 3 : 2;
  } else if (s.context.phase === "Collection") {
    // If you can move opponent markers, you played a "move 3" token
    // Otherwise, the books upgrade allow you to move 2/3/4/5 tokens
    return canMoveOponnentMarkers(s) ? 3 : book + 1;
  } else if (s.context.phase === "Movement") {
    // The hand is emptied with actions
    return s.context.hand.length + s.context.actions.length;
  } else if (s.context.phase === "Markers") {
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
  const act = s.context.prev!.actions[s.context.prev!.actions.length - 1] as ActionRecord<"displace">;
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
 * Returns the largest office network for a player
 */
export const largestNetwork = (s: GameState, p: number) => {
  const officeCount: { [key: string]: number } = {};
  for (const city in s.cities) {
    const count =
      s.cities[city].tokens.filter((t) => t?.owner === p).length +
      s.cities[city].extras.filter((t) => t?.owner === p).length;
    if (count) {
      officeCount[city] = count;
    }
  }

  const visited = new Set<string>([]);
  const visit = (city: string): number => {
    if (visited.has(city) || !(city in officeCount)) {
      return 0;
    }
    visited.add(city);
    return officeCount[city] + s.map.cities[city].neighbors.map(visit).reduce((a, b) => a + b);
  };

  return Math.max(0, ...Object.keys(officeCount).map((city) => visit(city)));
};

/**
 * Returns true if a player has an office in each city along at least
 * one route (including the "from" and "to" cities).
 */
export const areCitiesLinked = (s: GameState, from: string, to: string, p: number) => {
  const presence: { [key: string]: boolean } = {};
  for (const city in s.cities) {
    const count =
      s.cities[city].tokens.filter((t) => t?.owner === p).length +
      s.cities[city].extras.filter((t) => t?.owner === p).length;
    if (count) {
      presence[city] = true;
    }
  }
  if (!(from in presence && to in presence)) {
    return false;
  }
  const visited = new Set<string>([]);
  const visit = (city: string): boolean => {
    if (visited.has(city) || !presence[city]) {
      return false;
    }
    if (city === to) {
      return true;
    }
    visited.add(city);
    for (const neighbor of s.map.cities[city].neighbors) {
      if (visit(neighbor)) {
        return true;
      }
    }
    return false;
  };

  return visit(from);
};

/**
 * Returns the total points for a player
 */
export const totalPoints = (s: GameState, index: number) => {
  const p = s.players[index];
  const m = p.usedMarkers.length + p.readyMarkers.length;
  return (
    // Regular points
    p.points +
    // Points from markers
    (m > 9 ? 21 : m > 7 ? 15 : m > 5 ? 10 : m > 3 ? 6 : m > 1 ? 3 : m > 0 ? 1 : 0) +
    // Points from full ugprades
    (p.book === 4 ? 4 : 0) +
    (p.bank === 4 ? 4 : 0) +
    (p.privilege === 4 ? 4 : 0) +
    (p.actions === 6 ? 4 : 0) +
    // Points from largest network
    largestNetwork(s, index) * (p.keys > 4 ? 4 : p.keys > 3 ? 3 : p.keys > 1 ? 2 : 1) +
    // Points from coellen barrels
    s.coellen.map((t, i) => (t === index ? [7, 8, 9, 11][i] : 0)).reduce((a, b) => a + b) +
    // Points from controlled cities
    (Object.keys(s.cities).map((c) => (cityOwner(s, c) === index ? 2 : 0)) as number[]).reduce((a, b) => a + b)
  );
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

/**
 * Returns true if an office can be swapped by the current player
 */
export const canSwapOffice = (s: GameState, cityName: string, office: number) => {
  return (
    s.context.phase === "Swap" && // Swap phase only
    s.cities[cityName].tokens.length > office + 1 && // Must not be the rightmost office
    s.cities[cityName].tokens[office].owner === s.context.player // Must be yours too
  );
};


/**
 * Returns true if the passed city is full
 */
export const isCityFull = (s: GameState, cityName: string) => {
  return s.cities[cityName].tokens.length === s.map.cities[cityName].offices.length;
};

/**
 * Returns the number of full cities
 */
export const fullCityCount = (s: GameState) => {
  return Object.keys(s.cities).filter((c) => isCityFull(s, c)).length;
};

/**
 * Returns `true` if the passed route index is eligible for bonus marker placement
 */
export const canPlaceBonusMarker = (s: GameState, routeIndex: number) => {
  const route = s.routes[routeIndex];
  const { from, to } = s.map.routes[routeIndex];
  return (
    (!route.tokens || !route.tokens.some((t) => t)) && !route.marker && !(isCityFull(s, from) && isCityFull(s, to))
  );
};

// VALIDATOR FUNCTIONS

const noMoreTokens = (s: GameState) => {
  const { generalStock, personalSupply } = getPlayer(s);
  return s.context.hand.length + generalStock.m + generalStock.t + personalSupply.m + personalSupply.t === 0
    ? "You have no more tokens"
    : null;
};

const noActionsRemaining = (s: GameState) =>
  availableActionsCount(s) === s.context.actions.filter((a) => a.name !== "marker-use").length
    ? "No actions remaining"
    : null;

const insufficientReadyTokens = (s: GameState, amount: number, merch?: boolean) => {
  const { m, t } = getPlayer(s).personalSupply;
  return (merch === undefined ? m + t : merch ? m : t) < amount
    ? `Not enough ${merch ? "merchants" : "tradesmen"}`
    : null;
};

const gamePhaseIsNot = (s: GameState, p: Phase[]) =>
  p.includes(s.context.phase) ? null : "You can't perform that action now";

const generalStockEmpty = (s: GameState) =>
  getPlayer(s).generalStock.m + getPlayer(s).generalStock.t < 1 ? "General Stock is Empty" : null;

const tradingPostTaken = (s: GameState, post: [number, number]) => (getPost(s, post) ? "Trading Post is Taken" : null);

const tradingPostEmpty = (s: GameState, post: [number, number]) => (!getPost(s, post) ? "Trading Post is Empty" : null);

const routeIsNotComplete = (s: GameState, routeIndex: number) =>
  s.routes[routeIndex].tokens.some((t) => t?.owner !== s.context.player) ? "The route is not complete" : null;

const cityIsFull = (s: GameState, cityName: string) => {
  return s.cities[cityName].tokens.length === s.map.cities[cityName].offices.length ? "City is full" : null;
};

const hasNoUpgradesLeft = (s: GameState) => {
  const { book, bank, actions, privilege, keys } = getPlayer(s);
  return book === 4 && bank === 4 && actions === 6 && privilege === 4 && keys === 5
    ? "You have nothing to upgrade"
    : null;
};

const hasNoSwappableOffice = (s: GameState) => {
  return Object.values(s.cities).some((cs) => {
    const office = cs.tokens.findIndex((t) => t.owner === s.context.player);
    if (office === -1 || office === cs.tokens.length - 1) {
      return false;
    }
    return true;
  })
    ? null
    : "No office eligible for swapping";
};

const insufficientPrivilegeForCity = (s: GameState, cityName: string) => {
  const { privilege } = getPlayer(s);
  return s.map.cities[cityName].offices[s.cities[cityName].tokens.length]?.color >= privilege
    ? "Insufficient privilege to claim this city"
    : null;
};

const noMerchantToken = (s: GameState, cityName: string) => {
  const requiresMerch = s.map.cities[cityName].offices[s.cities[cityName].tokens.length]?.merch;
  if (requiresMerch && s.context.hand.every((t) => t.token === "t")) {
    return "A merchant is required to claim that office";
  }
  return null;
};

const tradingPostOwn = (s: GameState, post: [number, number]) =>
  getPost(s, post)!.owner === s.context.player ? "Trading Post is Yours" : null;

const tradingPostNotOwn = (s: GameState, post: [number, number]) =>
  getPost(s, post)!.owner !== s.context.player ? "Trading Post is not Yours" : null;

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
      (!canMoveOponnentMarkers(s) && tradingPostNotOwn(s, post))
    );
  } else if (name === "move-place") {
    const { post } = params as ActionParams<"move-place">;
    return (
      gamePhaseIsNot(s, ["Collection", "Movement"]) ||
      (s.context.phase === "Movement" ? noActionsRemaining(s) : null) ||
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
  } else if (name === "marker-use") {
    const { kind } = params as ActionParams<"marker-use">;
    return (
      gamePhaseIsNot(s, ["Actions"]) ||
      (kind === "Upgrade" && hasNoUpgradesLeft(s)) ||
      (kind === "Swap" && hasNoSwappableOffice(s))
    );
  } else if (name === "marker-swap") {
    const { city, office } = params as ActionParams<"marker-swap">;
    return gamePhaseIsNot(s, ["Swap"]) || (canSwapOffice(s, city, office) ? null : "Can't swap that office");
  } else if (name === "marker-office") {
    gamePhaseIsNot(s, ["Route"]);
  } else if (name === "done") {
    // TODO: validate
  }

  return null;
};
