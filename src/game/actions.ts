import { canEndTurn, canUpgrade, cityOwner, getPlayer, getPost, incomeValue } from "./helpers";
import { ActionName, ActionParams, PhaseState, GameState, TokenState, Reward } from "./model";

/**
 * Executes an action by name and passed params.
 * The action can mutate the state and should return a new "PhaseState".
 */
export const executeAction = <T extends ActionName>(
  name: T,
  state: GameState,
  params?: ActionParams<T>
): PhaseState => {
  switch (name) {
    case "income":
      return IncomeAction(state);
    case "place":
      return PlaceAction(state, params as ActionParams<"place">);
    case "done":
      return DoneAction(state);
    case "displace":
      return DisplaceAction(state, params as ActionParams<"displace">);
    case "displace-place":
      return DisplacePlaceAction(state, params as ActionParams<"displace-place">);
    case "move-collect":
      return MoveCollectAction(state, params as ActionParams<"move-collect">);
    case "move-place":
      return MovePlaceAction(state, params as ActionParams<"move-place">);
    case "route":
      return RouteAction(state, params as ActionParams<"route">);
    case "route-empty":
      return RouteEmptyAction(state);
    case "route-office":
      return OfficeAction(state, params as ActionParams<"route-office">);
    case "route-upgrade":
      return UpgradeAction(state, params as ActionParams<"route-upgrade">);
    case "marker-place":
      return MarkerPlaceAction(state, params as ActionParams<"marker-place">);
    case "marker-use":
      return MarkerUseAction(state, params as ActionParams<"marker-use">);
    default:
      throw new Error(`Unknown action "${name}"`);
  }
};

/**
 * Ends the turn for the current player.
 */
export const DoneAction = (s: GameState) => {
  if (!canEndTurn(s)) {
    return s.current;
  }

  // When you end your turn, you must place all unplaced markers
  if (getPlayer(s).unplacedMarkers.length > 0) {
    return {
      phase: "Markers",
      player: s.current.player,
      actions: [],
      hand: [],
      prev: s.current,
    } as PhaseState;
  }

  if (s.current.phase === "Displacement") {
    return s.current.prev!;
  }

  s.turn += 1;
  return {
    phase: "Actions",
    player: s.turn % s.players.length,
    actions: [],
    hand: [],
  } as PhaseState;
};

/**
 * Moves 3/5/7/All merchants / tradesmen from the general reserve to the personal supply.
 * Moves merchants first automatically (simpler implementation)
 */
export const IncomeAction = (s: GameState) => {
  const { generalStock, personalSupply } = getPlayer(s);

  let val = incomeValue(s);
  while (val > 0 && generalStock.m + generalStock.t > 0) {
    val--;
    if (generalStock.m) {
      personalSupply.m++;
      generalStock.m--;
    } else {
      personalSupply.t++;
      generalStock.t--;
    }
  }

  return s.current;
};

/**
 * Places a tradesman or a merchant on a trading post.
 */
export const PlaceAction = (s: GameState, params: ActionParams<"place">) => {
  const { personalSupply } = getPlayer(s);
  if (params.merch) {
    personalSupply.m -= 1;
  } else {
    personalSupply.t -= 1;
  }
  s.routes[params.post[0]].tokens[params.post[1]] = { owner: s.current.player, merch: params.merch };
  return s.current;
};

/**
 * Displaces an opponent's tradesman or a merchant and passes control to the other player.
 * This action can't be "undone" - it effectively ends your turn.
 */
export const DisplaceAction = (s: GameState, params: ActionParams<"displace">) => {
  const displacedToken = s.routes[params.post[0]].tokens[params.post[1]]!;
  const player = getPlayer(s);
  const price = displacedToken.merch ? 2 : 1;

  // Add the new token
  s.routes[params.post[0]].tokens[params.post[1]] = { owner: s.current.player, merch: params.merch };
  if (params.merch) {
    player.personalSupply.m -= 1;
  } else {
    player.personalSupply.t -= 1;
  }

  // Pay the price
  if (price > player.personalSupply.t) {
    player.generalStock.m += price - player.personalSupply.t;
    player.personalSupply.m -= price - player.personalSupply.t;
    player.generalStock.t += player.personalSupply.t;
    player.personalSupply.t = 0;
  } else {
    player.personalSupply.t -= price;
    player.generalStock.t += price;
  }

  // Pass the turn to the opponent and set the phase
  return {
    phase: "Displacement",
    player: displacedToken.owner,
    actions: [],
    hand: [{ token: displacedToken.merch ? "m" : "t", owner: displacedToken.owner }],
    prev: s.current,
  } as PhaseState;
};

/**
 * Places your "next" displaced tradesmen or merchant.
 * The next one is determined as follows:
 *  - The original displaced token in your hand
 *  - A tradesman from the general stock
 *  - A merchant from the general stock
 *  - A tradesman from the personal supply
 *  - A merchant from the personal supply
 *
 * CAVEAT: In the game rules, if there are no more tokens to place even in the personal supply
 * the player is allowed to move any token on the board. We don't allow this for now.
 */
export const DisplacePlaceAction = (s: GameState, params: ActionParams<"displace-place">) => {
  const token = { owner: s.current.player } as TokenState;

  if (s.current.actions.length === 0) {
    token.merch = s.current.hand.pop()?.token === "m";
  } else {
    // Placing tokens from general stock and personal supply
    const { generalStock, personalSupply } = getPlayer(s);
    if (generalStock.t) {
      generalStock.t -= 1;
    } else if (generalStock.m) {
      generalStock.m -= 1;
      token.merch = true;
    } else if (personalSupply.t) {
      personalSupply.t -= 1;
    } else if (personalSupply.m) {
      personalSupply.m -= 1;
      token.merch = true;
    }
  }

  s.routes[params.post[0]].tokens[params.post[1]] = token;
  return s.current;
};

/**
 * Collects a token on the board to be moved and adds it to the hand
 */
export const MoveCollectAction = (s: GameState, params: ActionParams<"move-collect">) => {
  const token = getPost(s, params.post)!;
  s.routes[params.post[0]].tokens[params.post[1]] = null;

  if (s.current.phase === "Actions") {
    return {
      phase: "Collection",
      player: s.current.player,
      prev: s.current,
      hand: [{ token: token.merch ? "m" : "t", owner: token.owner }],
      actions: [{ name: "move-collect", params }],
    } as PhaseState;
  } else if (s.current.phase === "Collection") {
    s.current.hand.push({ token: token.merch ? "m" : "t", owner: token.owner });
  }

  return s.current;
};

/**
 * Places the next token in your hand on an empty trading post.
 *
 */
export const MovePlaceAction = (s: GameState, params: ActionParams<"move-place">) => {
  const tok = s.current.hand.shift()!;
  s.routes[params.post[0]].tokens[params.post[1]] = { owner: tok.owner, merch: tok.token === "m" };

  if (s.current.hand.length === 0) {
    // When you empty the hand revert to the actions phase immediately
    return s.current.prev!;
  }

  if (s.current.phase === "Collection") {
    // The first movement action means we started placing tokens
    // Transition to the movement phase
    return {
      phase: "Movement",
      actions: [{ name: "move-place", params }],
      hand: s.current.hand,
      player: s.current.player,
      prev: s.current.prev, // We discard the "collection" phase entirely
    } as PhaseState;
  }

  return s.current;
};

/**
 * Completes a route, allowing a player to choose rewards
 */
export const RouteAction = (s: GameState, params: ActionParams<"route">) => {
  const rewards: Reward[] = [{ title: "Do nothing", action: { name: "route-empty", params: {} } }];

  const privilege = getPlayer(s).privilege;
  const route = s.map.routes[params.route];
  const r = s.routes[params.route];

  const merchants = r.tokens.filter((t) => t?.merch).length;
  const tradesmen = r.tokens.length - merchants;

  const cityFrom = s.map.cities[route.from];
  const cityTo = s.map.cities[route.to];
  const cFrom = s.cities[route.from];
  const cTo = s.cities[route.to];

  const nextOfficeFrom = cityFrom.offices[cFrom.tokens.length];
  const nextOfficeTo = cityTo.offices[cTo.tokens.length];

  if (nextOfficeFrom && (!nextOfficeFrom.merch || merchants) && nextOfficeFrom.color <= privilege) {
    rewards.push({
      title: `Office in ${route.from}`,
      action: { name: "route-office", params: { city: route.from } },
    });
  }
  if (nextOfficeTo && (!nextOfficeTo.merch || merchants) && nextOfficeTo.color <= privilege) {
    rewards.push({
      title: `Office in ${route.to}`,
      action: { name: "route-office", params: { city: route.to } },
    });
  }
  if (cityFrom.upgrade && canUpgrade(s, cityFrom.upgrade)) {
    rewards.push({
      title: `Upgrade ${cityFrom.upgrade}`,
      action: { name: "route-upgrade", params: { upgrade: cityFrom.upgrade } },
    });
  }
  if (cityTo.upgrade && canUpgrade(s, cityTo.upgrade)) {
    rewards.push({
      title: `Upgrade ${cityTo.upgrade}`,
      action: { name: "route-upgrade", params: { upgrade: cityTo.upgrade } },
    });
  }

  // Collect bonus markers
  let endGame = false;
  if (r.marker) {
    const newMarker = s.markers.pop();
    if (newMarker) {
      getPlayer(s).unplacedMarkers.push(newMarker);
    } else {
      endGame = true;
    }
    getPlayer(s).readyMarkers.push(r.marker);
    delete r.marker;
  }

  // Assign points to players
  const fromOwner = cityOwner(s, route.from);
  const toOwner = cityOwner(s, route.to);
  if (fromOwner !== -1) {
    s.players[fromOwner].points += 1;
  }
  if (toOwner !== -1) {
    s.players[toOwner].points += 1;
  }

  // Remove all tokens from the route and put them in the player's hand
  r.tokens = r.tokens.map((t) => null);
  return {
    phase: "Route",
    actions: [],
    hand: [
      ...Array.from(Array(merchants)).map((_) => ({ token: "m", owner: s.current.player })),
      ...Array.from(Array(tradesmen)).map((_) => ({ token: "t", owner: s.current.player })),
    ],
    rewards,
    player: s.current.player,
    prev: s.current,
    endGame,
  } as PhaseState;
};

/**
 * Claims a route without setting up an office or upgrading
 */
export const RouteEmptyAction = (s: GameState) => {
  const player = getPlayer(s);
  for (const t of s.current.hand) {
    player.generalStock[t.token] += 1;
  }
  // TODO: last(s.current.prev.actions).description = "Did nothing";
  return s.current.prev!;
};

/**
 * Creates an office in a city
 */
export const OfficeAction = (s: GameState, params: ActionParams<"route-office">) => {
  const player = getPlayer(s);
  const city = s.map.cities[params.city];
  const cityState = s.cities[params.city];
  const office = city.offices[cityState.tokens.length];

  s.current.hand.splice(
    s.current.hand.findIndex((tok) => tok.token === (office.merch ? "m" : "t")),
    1
  );
  for (const t of s.current.hand) {
    player.generalStock[t.token] += 1;
  }
  s.current.hand = [];
  cityState.tokens.push({ owner: s.current.player, merch: office.merch });
  player.points += office.point ? 1 : 0;

  // TODO: last(s.current.prev.actions).description = "Established an office";
  return s.current.prev!;
};

/**
 * Performs an upgrade
 */
export const UpgradeAction = (s: GameState, params: ActionParams<"route-upgrade">) => {
  const player = getPlayer(s);

  player[params.upgrade] += 1;
  player.personalSupply[params.upgrade === "book" ? "m" : "t"] += 1;
  for (const t of s.current.hand) {
    player.generalStock[t.token] += 1;
  }
  s.current.hand = [];

  // TODO: last(s.current.prev.actions).description = "Made an upgrade";
  return s.current.prev!;
};

/**
 * Places a bonus marker on an empty trade route adjacent to at least one
 * non-completed city.
 */
export const MarkerPlaceAction = (s: GameState, params: ActionParams<"marker-place">) => {
  s.routes[params.route].marker = getPlayer(s).unplacedMarkers.shift();
  return s.current;
};

/**
 * Activates a bonus marker
 */
export const MarkerUseAction = (s: GameState, params: ActionParams<"marker-use">) => {
  const p = getPlayer(s);
  const [marker] = p.readyMarkers.splice(
    p.readyMarkers.findIndex((m) => m === params.kind),
    1
  );
  p.usedMarkers.push(marker);

  if (params.kind === "Move 3") {
    return {
      phase: "Collection",
      player: s.current.player,
      prev: s.current,
      hand: [],
      actions: [],
    } as PhaseState;
  } else if (params.kind === "Upgrade") {
    const rewards: Reward[] = [];
    if (p.bank < 4) {
      rewards.push({ title: "Upgrade bank", action: { name: "route-upgrade", params: { upgrade: "bank" } } });
    }
    if (p.actions < 6) {
      rewards.push({ title: "Upgrade actions", action: { name: "route-upgrade", params: { upgrade: "actions" } } });
    }
    if (p.keys < 5) {
      rewards.push({ title: "Upgrade keys", action: { name: "route-upgrade", params: { upgrade: "keys" } } });
    }
    if (p.book < 4) {
      rewards.push({ title: "Upgrade book", action: { name: "route-upgrade", params: { upgrade: "book" } } });
    }
    if (p.privilege < 4) {
      rewards.push({ title: "Upgrade privilege", action: { name: "route-upgrade", params: { upgrade: "privilege" } } });
    }
    return {
      phase: "Upgrade",
      player: s.current.player,
      prev: s.current,
      hand: [],
      actions: [],
      rewards,
    } as PhaseState;
  } else if (params.kind === "3 Actions") {
  } else if (params.kind === "4 Actions") {
  } else if (params.kind === "Swap") {
    // Choose office to swap (extra action)
  } else if (params.kind === "Place") {
    // Choose where to place (extra action)
  }
  return s.current;
};
