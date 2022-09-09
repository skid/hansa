import {
  areCitiesLinked,
  canEndTurn,
  canUpgrade,
  cityOwner,
  fullCityCount,
  getPlayer,
  getPost,
  incomeValue,
  validExtraOfficeLocations,
} from "./helpers";
import { ActionName, ActionParams, PhaseContext, GameState, TokenState, Reward, ActionRecord } from "./model";

/**
 * Executes an action by name and passed params.
 * The action can mutate the state and should return a new "PhaseState".
 */
export const executeAction = <T extends ActionName>(
  name: T,
  state: GameState,
  params?: ActionParams<T>
): PhaseContext => {
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
    case "route-barrel":
      return BarrelAction(state, params as ActionParams<"route-barrel">);
    case "route-upgrade":
      return UpgradeAction(state, params as ActionParams<"route-upgrade">);
    case "marker-place":
      return MarkerPlaceAction(state, params as ActionParams<"marker-place">);
    case "marker-use":
      return MarkerUseAction(state, params as ActionParams<"marker-use">);
    case "marker-swap":
      return MarkerSwapAction(state, params as ActionParams<"marker-swap">);
    case "marker-office":
      return MarkerOfficeAction(state, params as ActionParams<"marker-office">);
    default:
      throw new Error(`Unknown action "${name}"`);
  }
};

/**
 * Ends the turn for the current player.
 */
export const DoneAction = (s: GameState) => {
  if (!canEndTurn(s)) {
    return s.context;
  }

  // When you end your turn, you must place all unplaced markers
  if (getPlayer(s).unplacedMarkers.length > 0) {
    return {
      phase: "Markers",
      player: s.context.player,
      actions: [],
      hand: [],
      prev: s.context,
    } as PhaseContext;
  }

  if (s.context.phase === "Displacement") {
    return s.context.prev!;
  }

  s.turn += 1;
  s.log.push({
    message: `It's ${s.players[s.turn % s.players.length].name}'s turn`,
    player: s.turn % s.players.length,
  });
  return {
    phase: "Actions",
    player: s.turn % s.players.length,
    actions: [],
    hand: [],
  } as PhaseContext;
};

/**
 * Moves 3/5/7/All merchants / tradesmen from the general reserve to the personal supply.
 * Moves merchants first automatically (simpler implementation)
 */
export const IncomeAction = (s: GameState) => {
  const { generalStock, personalSupply, name } = getPlayer(s);

  let val = incomeValue(s);
  let merchs = 0;
  let trades = 0;
  while (val > 0 && generalStock.m + generalStock.t > 0) {
    val--;
    if (generalStock.m) {
      personalSupply.m++;
      generalStock.m--;
      merchs++;
    } else {
      personalSupply.t++;
      generalStock.t--;
      trades++;
    }
  }

  s.log.push({ player: s.context.player, message: `${name} purchases ${trades} + ${merchs} tokens` });
  return s.context;
};

/**
 * Places a tradesman or a merchant on a trading post.
 */
export const PlaceAction = (s: GameState, params: ActionParams<"place">) => {
  const { name, personalSupply } = getPlayer(s);
  const { from, to } = s.map.routes[params.post[0]];

  if (params.merch) {
    personalSupply.m -= 1;
  } else {
    personalSupply.t -= 1;
  }
  s.routes[params.post[0]].tokens[params.post[1]] = { owner: s.context.player, merch: params.merch };
  s.log.push({
    player: s.context.player,
    message: `${name} places a ${params.merch ? "merchant" : "tradesman"} at ${from} - ${to}`,
  });
  return s.context;
};

/**
 * Displaces an opponent's tradesman or a merchant and passes control to the other player.
 * This action can't be "undone" - it effectively ends your turn.
 */
export const DisplaceAction = (s: GameState, params: ActionParams<"displace">) => {
  const displacedToken = s.routes[params.post[0]].tokens[params.post[1]]!;
  const player = getPlayer(s);
  const price = displacedToken.merch ? 2 : 1;
  const { from, to } = s.map.routes[params.post[0]];

  // Add the new token
  s.routes[params.post[0]].tokens[params.post[1]] = { owner: s.context.player, merch: params.merch };
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

  s.log.push({
    player: s.context.player,
    message: `${player.name} displaces ${s.players[displacedToken.owner].name}'s ${
      displacedToken.merch ? "merchant" : "tradesman"
    } with a ${params.merch ? "merchant" : "tradesman"} at ${from} - ${to}`,
  });

  // Pass the turn to the opponent and set the phase
  return {
    phase: "Displacement",
    player: displacedToken.owner,
    actions: [],
    hand: [{ token: displacedToken.merch ? "m" : "t", owner: displacedToken.owner }],
    prev: s.context,
  } as PhaseContext;
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
  const token = { owner: s.context.player } as TokenState;
  const { name } = getPlayer(s);
  const { from, to } = s.map.routes[params.post[0]];

  if (s.context.actions.length === 0) {
    token.merch = s.context.hand.pop()?.token === "m";
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
  s.log.push({
    player: s.context.player,
    message: `${name} places a displaced ${token.merch ? "merchant" : "tradesman"} at ${from} - ${to}`,
  });
  return s.context;
};

/**
 * Collects a token on the board to be moved and adds it to the hand
 */
export const MoveCollectAction = (s: GameState, params: ActionParams<"move-collect">) => {
  const { name } = getPlayer(s);
  const { from, to } = s.map.routes[params.post[0]];
  const token = getPost(s, params.post)!;
  s.routes[params.post[0]].tokens[params.post[1]] = null;

  if (s.context.phase === "Actions") {
    return {
      phase: "Collection",
      player: s.context.player,
      prev: s.context,
      hand: [{ token: token.merch ? "m" : "t", owner: token.owner }],
      actions: [{ name: "move-collect", params }],
    } as PhaseContext;
  } else if (s.context.phase === "Collection") {
    s.context.hand.push({ token: token.merch ? "m" : "t", owner: token.owner });
  }

  s.log.push({
    player: s.context.player,
    message: `${name} moves a ${token.merch ? "merchant" : "tradesman"} from ${from} - ${to}`,
  });
  return s.context;
};

/**
 * Places the next token in your hand on an empty trading post.
 *
 */
export const MovePlaceAction = (s: GameState, params: ActionParams<"move-place">) => {
  const { name } = getPlayer(s);
  const { from, to } = s.map.routes[params.post[0]];
  const tok = s.context.hand.shift()!;
  s.routes[params.post[0]].tokens[params.post[1]] = { owner: tok.owner, merch: tok.token === "m" };

  if (s.context.hand.length === 0) {
    // When you empty the hand revert to the actions phase immediately
    return s.context.prev!;
  }

  s.log.push({
    player: s.context.player,
    message: `${name} moves a ${tok.token === "m" ? "merchant" : "tradesman"} to ${from} - ${to}`,
  });

  if (s.context.phase === "Collection") {
    // The first movement action means we started placing tokens
    // Transition to the movement phase
    return {
      phase: "Movement",
      actions: [{ name: "move-place", params }],
      hand: s.context.hand,
      player: s.context.player,
      prev: s.context.prev, // We discard the "collection" phase entirely
    } as PhaseContext;
  }

  return s.context;
};

/**
 * Completes a route, allowing a player to choose rewards
 */
export const RouteAction = (s: GameState, params: ActionParams<"route">) => {
  const rewards: Reward[] = [{ title: "Do nothing", action: { name: "route-empty", params: {} } }];

  const { privilege, name } = getPlayer(s);
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

  if (nextOfficeFrom && (!nextOfficeFrom.merch || merchants) && nextOfficeFrom.color <= privilege - 1) {
    rewards.push({
      title: `Office in ${route.from}`,
      action: { name: "route-office", params: { city: route.from } },
    });
  }
  if (nextOfficeTo && (!nextOfficeTo.merch || merchants) && nextOfficeTo.color <= privilege - 1) {
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
  if ((route.from === "Coellen" || route.to === "Coellen") && merchants > 0) {
    s.coellen.forEach((value, index) => {
      if (value !== null || privilege - 1 < index) {
        return;
      }
      rewards.push({
        title: `Use a merchant to score ${[7, 8, 9, 11][index]} points`,
        action: { name: "route-barrel", params: { barrel: index } },
      });
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
    s.log.push({
      player: fromOwner,
      message: `${s.players[fromOwner].name} scores 1 because they own ${route.from}`,
    });
  }
  if (toOwner !== -1) {
    s.players[toOwner].points += 1;
    s.log.push({
      player: toOwner,
      message: `${s.players[toOwner].name} scores 1 because they own ${route.to}`,
    });
  }

  // Remove all tokens from the route and put them in the player's hand
  r.tokens = r.tokens.map((t) => null);

  s.log.push({
    player: s.context.player,
    message: `${name} completes the ${route.from} - ${route.to} route`,
  });

  if (endGame) {
    s.log.push({ player: -1, message: `Game over due all markers being used` });
  }

  return {
    phase: "Route",
    actions: [],
    hand: [
      ...Array.from(Array(merchants)).map((_) => ({ token: "m", owner: s.context.player })),
      ...Array.from(Array(tradesmen)).map((_) => ({ token: "t", owner: s.context.player })),
    ],
    rewards,
    player: s.context.player,
    prev: s.context,
    endGame,
  } as PhaseContext;
};

/**
 * Claims a route without setting up an office or upgrading
 */
export const RouteEmptyAction = (s: GameState) => {
  const player = getPlayer(s);
  for (const t of s.context.hand) {
    player.generalStock[t.token] += 1;
  }

  s.log.push({
    player: s.context.player,
    message: `${player.name} claims no reward for completing the route`,
  });

  if (s.players.find((p) => p.points >= 20)) {
    s.context.prev!.endGame = true;
    s.log.push({ player: -1, message: `Game over due to a player reaching 20 points` });
  }

  // TODO: last(s.current.prev.actions).description = "Did nothing";
  return s.context.prev!;
};

/**
 * Creates an office in a city
 */
export const OfficeAction = (s: GameState, params: ActionParams<"route-office">) => {
  const player = getPlayer(s);
  const city = s.map.cities[params.city];
  const cityState = s.cities[params.city];
  const office = city.offices[cityState.tokens.length];

  s.context.hand.splice(
    s.context.hand.findIndex((tok) => tok.token === (office.merch ? "m" : "t")),
    1
  );
  for (const t of s.context.hand) {
    player.generalStock[t.token] += 1;
  }
  s.context.hand = [];
  cityState.tokens.push({ owner: s.context.player, merch: office.merch });
  player.points += office.point ? 1 : 0;

  if (!player.linkEastWest && areCitiesLinked(s, "Arnheim", "Stendal", s.context.player)) {
    const awardedPoints = [7, 4, 2, 0, 0][s.players.filter((p) => p.linkEastWest).length];
    player.points += awardedPoints;
    player.linkEastWest = true;
    s.log.push({
      player: s.context.player,
      message: `${player.name} scores ${awardedPoints} for completing the east-west route`,
    });
  }

  s.log.push({
    player: s.context.player,
    message: `${player.name} establishes an office in ${city.name}.`,
  });

  if (fullCityCount(s) === 10) {
    s.context.prev!.endGame = true;
    s.log.push({ player: -1, message: `Game over due to 10 full cities` });
  }

  if (s.players.find((p) => p.points >= 20)) {
    s.context.prev!.endGame = true;
    s.log.push({ player: -1, message: `Game over due to a player reaching 20 points` });
  }

  return s.context.prev!;
};

/**
 * Takes up a Coellen barrel
 */
export const BarrelAction = (s: GameState, params: ActionParams<"route-barrel">) => {
  const player = getPlayer(s);
  s.context.hand.splice(
    s.context.hand.findIndex((tok) => tok.token === "m"),
    1
  );
  for (const t of s.context.hand) {
    player.generalStock[t.token] += 1;
  }
  s.context.hand = [];
  s.coellen[params.barrel] = s.context.player;

  const barrels = ["white (7pt)", "orange (8pt)", "purple (9pt)", "black (11pt)"];
  s.log.push({
    player: s.context.player,
    message: `${player.name} scores the the ${barrels[params.barrel]} Coellen barrel`,
  });

  if (s.players.find((p) => p.points >= 20)) {
    s.context.prev!.endGame = true;
    s.log.push({ player: -1, message: `Game over due to a player reaching 20 points` });
  }

  return s.context.prev!;
};

/**
 * Performs an upgrade
 */
export const UpgradeAction = (s: GameState, params: ActionParams<"route-upgrade">) => {
  const player = getPlayer(s);

  player[params.upgrade] += 1;
  player.personalSupply[params.upgrade === "book" ? "m" : "t"] += 1;
  for (const t of s.context.hand) {
    player.generalStock[t.token] += 1;
  }
  s.context.hand = [];

  s.log.push({
    player: s.context.player,
    message: `${player.name} upgrades their ${params.upgrade}.`,
  });

  if (s.players.find((p) => p.points >= 20)) {
    s.context.prev!.endGame = true;
    s.log.push({ player: -1, message: `Game over due to a player reaching 20 points` });
  }

  return s.context.prev!;
};

/**
 * Places a bonus marker on an empty trade route adjacent to at least one
 * non-completed city.
 */
export const MarkerPlaceAction = (s: GameState, params: ActionParams<"marker-place">) => {
  const player = getPlayer(s);
  const marker = player.unplacedMarkers.shift();
  const { from, to } = s.map.routes[params.route];

  s.log.push({
    player: s.context.player,
    message: `${player.name} places a "${marker}" marker at ${from} - ${to}`,
  });
  s.routes[params.route].marker = marker;
  return s.context;
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
  s.log.push({
    player: s.context.player,
    message: `${p.name} uses their "${marker}" marker`,
  });

  if (params.kind === "Move 3") {
    return {
      phase: "Collection",
      player: s.context.player,
      prev: s.context,
      hand: [],
      actions: [],
    } as PhaseContext;
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
      player: s.context.player,
      prev: s.context,
      hand: [],
      actions: [],
      rewards,
    } as PhaseContext;
  } else if (params.kind === "3 Actions") {
    // Do nothing, availableActionsCount checks if a marker has been played
  } else if (params.kind === "4 Actions") {
    // Do nothing, availableActionsCount checks if a marker has been played
  } else if (params.kind === "Swap") {
    return {
      phase: "Swap",
      player: s.context.player,
      prev: s.context,
      hand: [],
      actions: [],
    } as PhaseContext;
  } else if (params.kind === "Office") {
    return {
      phase: "Office",
      player: s.context.player,
      prev: s.context,
      hand: [],
      actions: [],
      rewards: validExtraOfficeLocations(s).map((city) => ({
        title: `Establish an extra office in ${city}`,
        action: {
          name: "marker-office",
          params: { city },
        },
      })),
    } as PhaseContext;
  }
  return s.context;
};

/**
 * Swaps one of your offices with the one before it (or after it, if it's the first one)
 */
export const MarkerSwapAction = (s: GameState, params: ActionParams<"marker-swap">) => {
  const player = getPlayer(s);
  const { city, office } = params;
  const offices = s.cities[city].tokens;
  const swapWith = office < offices.length - 1 ? office + 1 : office;
  const temp = offices[swapWith];
  offices[swapWith] = offices[office];
  offices[office] = temp;

  s.log.push({
    player: s.context.player,
    message: `${player.name} swaps their office in ${city}`,
  });
  return s.context.prev!;
};

/**
 * Sets up an extra office in a city.
 * Tries to use a tradesman, then merchant from the general stock, then personal supply
 */
export const MarkerOfficeAction = (s: GameState, params: ActionParams<"marker-office">) => {
  const player = getPlayer(s);
  const { generalStock, personalSupply } = player;
  let merch = false;

  if (generalStock.t) {
    generalStock.t -= 1;
  } else if (generalStock.m) {
    generalStock.m -= 1;
    merch = true;
  } else if (personalSupply.t) {
    personalSupply.t -= 1;
  } else if (personalSupply.m) {
    personalSupply.m -= 1;
    merch = true;
  }

  // Extra offices are added from the left
  s.cities[params.city].extras.unshift({ owner: s.context.player, merch });
  s.log.push({
    player: s.context.player,
    message: `${player.name} sets up an extra office in ${params.city}`,
  });

  if (!player.linkEastWest && areCitiesLinked(s, "Arnheim", "Stendal", s.context.player)) {
    const awardedPoints = [7, 4, 2, 0, 0][s.players.filter((p) => p.linkEastWest).length];
    player.points += awardedPoints;
    player.linkEastWest = true;
    s.log.push({
      player: s.context.player,
      message: `${player.name} scores ${awardedPoints} for completing the east-west route`,
    });
  }

  if (s.players.find((p) => p.points >= 20)) {
    s.context.prev!.endGame = true;
    s.log.push({ player: -1, message: `Game over due to a player reaching 20 points` });
  }

  return s.context.prev!;
};
