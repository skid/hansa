import React, { MouseEventHandler, useContext, useEffect, useRef, useState } from "react";
import { BonusMarkerKind, City, Color, initGameState, Office, PlayerState } from "./model";
import {
  availableActionsCount,
  canEndTurn,
  canMoveOponnentMarkers,
  canPlaceBonusMarker,
  canSwapOffice,
  cityOwner,
  fullCityCount,
  getPlayer,
  incomeValue,
  totalPoints,
} from "./helpers";
import { defaultController, GameController, useController } from "./controller";

// Nice yellow: #EEBC1D
const playerColor = (color: Color) => (color === "yellow" ? "#D4AF37" : color);
const PrivilegeColorMap = ["white", "#F2AC29", "rgb(255, 145, 207)", "gray"];
const CityColorMap = (color: City["color"]) => (color === "red" ? "#faa" : color === "yellow" ? "#ffa" : "white");
const FontSize = 24;
const CityHeight = 60;
const OfficeWidth = 40;
const Margin = 8;
const PostRadius = 14;

type UIState = {
  merch: boolean;
  setMerch: (merch: boolean) => void;
};

const ControllerContext = React.createContext<{ controller: GameController; ui: UIState }>({
  controller: defaultController,
  ui: { merch: false, setMerch: () => {} },
});

const usePanZoom = (rebind = false) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const groupRef = useRef<SVGGElement>(null);
  const [{ scale, x, y }, setTransform] = useState({ scale: 1, x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!svgRef.current || !groupRef.current) {
      return;
    }
    const container = svgRef.current!.getBoundingClientRect();
    const content = groupRef.current!.getBoundingClientRect();

    // The first time we load, we center the map and leave 5% margins along the longer side
    const wRatio = container.width / (content.width || 1);
    const hRatio = container.height / (content.height || 1);
    const leftOffset = content.left - container.left;
    const topOffset = content.top - container.top;

    let newContentHeight;
    let newContentWidth;
    if (wRatio > hRatio) {
      // More horizontal space
      newContentHeight = 0.9 * container.height;
      newContentWidth = (content.width * newContentHeight) / content.height;
    } else {
      newContentWidth = 0.9 * container.width;
      newContentHeight = (content.height * newContentWidth) / content.width;
    }

    setTransform({
      scale: newContentWidth / content.width,
      x: (container.width - newContentWidth) / 2 - leftOffset * (newContentHeight / content.height),
      y: (container.height - newContentHeight) / 2 - topOffset * (newContentWidth / content.width),
    });
  }, [rebind]);

  const panStart = (x: number, y: number) => {
    setIsPanning({ x, y });
  };
  const panEnd = () => {
    setIsPanning(null);
  };
  const pan = (newX: number, newY: number) => {
    if (isPanning) {
      setIsPanning({ x: newX, y: newY });
      setTransform({ x: x + newX - isPanning.x, y: y + newY - isPanning.y, scale });
    }
  };
  const zoom = (d: number, mouseX: number, mouseY: number) => {
    // The zoom handler is attached to the SVG container, not the contents
    // We compensate for that here
    mouseX = mouseX - x;
    mouseY = mouseY - y;

    const factor = scale / (scale + d);
    const dx = (mouseX - x) * (factor - 1);
    const dy = (mouseY - y) * (factor - 1);
    setTransform({ x: x + dx, y: y + dy, scale: scale + d });
  };

  return { groupRef, svgRef, scale, x, y, zoom, pan, panStart, panEnd };
};

/**
 * Renders just the map, for development purposes
 */
const testState = initGameState({ red: "red", green: "green", blue: "blue" });
export const Map = () => {
  const { groupRef, svgRef, scale, x, y, panStart, pan, panEnd, zoom } = usePanZoom();
  const { map } = testState;
  return (
    <ControllerContext.Provider
      value={{
        controller: { state: testState, action: () => {}, reset: () => {}, playerId: "red" },
        ui: { merch: false, setMerch: () => {} },
      }}
    >
      <div id="container">
        {/* No Viewbox - we work with pixels */}
        <svg
          ref={svgRef}
          id="map"
          onMouseDown={(e) => {
            if (e.button === 2) {
              panStart(e.screenX, e.screenY);
            }
          }}
          onContextMenu={(e) => {
            e.preventDefault();
          }}
          onMouseUp={() => panEnd()}
          onMouseMove={(e) => pan(e.screenX, e.screenY)}
          onWheel={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            zoom(-e.deltaY / 2000, e.pageX - rect.left, e.pageY - rect.top);
          }}
        >
          <g ref={groupRef} id="game" transform={`scale(${scale}, ${scale}) translate(${x},${y})`}>
            <CoellenBarrels x={map.coellen[0]} y={map.coellen[1]} />
            {map.routes.map((r, i) => (
              <RouteComponent
                key={i}
                index={i}
                from={map.cities[r.from].position}
                to={map.cities[r.to].position}
                posts={r.posts}
              />
            ))}
            {Object.values(map.cities).map((city) => (
              <CityComponent key={city.name} cityName={city.name} />
            ))}
          </g>
        </svg>
      </div>
    </ControllerContext.Provider>
  );
};

/**
 * Renders the entire application.
 * Takes a GameState as an input parameter
 */
export const App = ({ gameId, playerId }: { gameId: string; playerId: string }) => {
  const ctrl = useController(gameId, playerId);
  const { groupRef, svgRef, scale, x, y, panStart, pan, panEnd, zoom } = usePanZoom(!!ctrl);
  const [merch, setMerch] = useState(false);

  useEffect(() => {
    if (player) {
      setMerch((player.personalSupply.m > 0 && merch) || player.personalSupply.t === 0);
    }
  });

  if (!ctrl) {
    return <div>Loading ... </div>;
  }

  const { map, players } = ctrl.state;
  const player = players.find((p) => p.id === ctrl.playerId)!;

  return (
    <ControllerContext.Provider value={{ controller: ctrl, ui: { merch, setMerch } }}>
      <div id="container">
        <div id="ui">
          <div id="gameinfo">
            Markers: {ctrl.state.markers.length} | Full Cities: {fullCityCount(ctrl.state)}/10
          </div>
          <PlayerControls />
        </div>
        <svg
          id="map"
          ref={svgRef}
          onMouseDown={(e) => {
            if (e.button === 2) {
              panStart(e.screenX, e.screenY);
            }
          }}
          onContextMenu={(e) => {
            e.preventDefault();
          }}
          onMouseUp={() => panEnd()}
          onMouseMove={(e) => pan(e.screenX, e.screenY)}
          onWheel={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            zoom(-e.deltaY / 2000, e.pageX - rect.left, e.pageY - rect.top);
          }}
        >
          <g ref={groupRef} id="game" transform={`scale(${scale}, ${scale}) translate(${x},${y})`}>
            <CoellenBarrels x={map.coellen[0]} y={map.coellen[1]} />
            {map.routes.map((r, i) => (
              <RouteComponent
                key={i}
                index={i}
                from={map.cities[r.from].position}
                to={map.cities[r.to].position}
                posts={r.posts}
              />
            ))}
            {Object.values(map.cities).map((city) => (
              <CityComponent key={city.name} cityName={city.name} />
            ))}
          </g>
        </svg>
      </div>
    </ControllerContext.Provider>
  );
};

export const PlayerControls = () => {
  const { controller } = useContext(ControllerContext);
  const { state, action, reset, playerId } = controller;
  const me = state.players.find((p) => p.id === playerId)!;
  const currentPlayer = getPlayer(state);

  const acts = availableActionsCount(state) - state.context.actions.filter((a) => a.name !== "marker-use").length;
  const { phase } = state.context;

  return (
    <div className={`player-controls`}>
      <div className="phase-info">
        {me !== currentPlayer
          ? `It's ${currentPlayer.name}'s turn`
          : phase === "Actions"
          ? acts
            ? `Take actions (${acts})`
            : `No actions left. End turn?`
          : phase === "Displacement"
          ? acts
            ? `Place ${acts} displaced tokens`
            : `Done placing. End turn?`
          : phase === "Collection"
          ? "Collect tokens to move"
          : phase === "Movement"
          ? "Place collected tokens"
          : phase === "Route"
          ? "Route complete! Choose:"
          : phase === "Markers"
          ? currentPlayer.unplacedMarkers[0]
            ? `Place a "${currentPlayer.unplacedMarkers[0]}" marker on an empty route`
            : `No markers to place. End turn?`
          : phase === "Upgrade"
          ? "Choose an upgrade"
          : phase === "Swap"
          ? "Choose one of your offices to swap it with the one on its right"
          : phase === "Office"
          ? "Choose a city to put an extra office"
          : "Invalid state"}
      </div>

      {me === currentPlayer && (
        <>
          {state.context.hand.length > 0 && (
            <div className={`hand ${playerColor(me.color)}`}>
              {state.context.hand.map((t, i) => (
                <div
                  key={i}
                  className={`token ${t.token === "m" ? "merchant" : "tradesman"} ${playerColor(
                    state.players[t.owner].color
                  )}`}
                />
              ))}
            </div>
          )}

          <div className="buttons">
            {phase === "Actions" && acts > 0 && (
              <button onClick={() => action("income")}>Purchase {incomeValue(state)} tokens</button>
            )}
            {state.context.rewards?.map((r, i) => (
              <button key={i} onClick={() => action(r.action.name, r.action.params)}>
                {r.title}
              </button>
            ))}
          </div>

          <div className="buttons">
            <button onClick={() => reset()}>Reset Turn</button>
            {canEndTurn(state) && (
              <button onClick={() => confirm(`End turn? Can't undo this!`) && action("done")}>End Turn</button>
            )}
          </div>
        </>
      )}

      <PlayerQuickInfo player={me} />

      {state.players
        .filter((p) => p !== me)
        .map((p) => {
          return <PlayerQuickInfo key={p.id} player={p} />;
        })}
    </div>
  );
};

export const OfficeComponent = ({ office, order, city }: { office: Office | null; order: number; city: City }) => {
  const left = Margin + order * (OfficeWidth + Margin);
  const top = (CityHeight - OfficeWidth) / 2;

  const { state, action } = useContext(ControllerContext).controller;

  const index = office !== null ? city.offices.indexOf(office) : order;
  const token = office !== null ? state.cities[city.name].tokens[index] : state.cities[city.name].extras[index];

  const claim = () => {
    if (index === state.cities[city.name].tokens.length) {
      action("route-office", { city: city.name });
    }
  };

  const onClick = () => {
    if (office !== null && canSwapOffice(state, city.name, index)) {
      action("marker-swap", { city: city.name, office: index });
    }
  };

  return (
    <g onClick={onClick}>
      {office &&
        (office.merch ? (
          <circle
            cx={left + OfficeWidth / 2}
            cy={top + OfficeWidth / 2}
            r={OfficeWidth / 2}
            fill={PrivilegeColorMap[office.color]}
            stroke="black"
            strokeWidth="2"
            onClick={claim}
          />
        ) : (
          <rect
            x={left}
            y={top}
            width={OfficeWidth}
            height={OfficeWidth}
            rx="1"
            fill={PrivilegeColorMap[office.color]}
            stroke="black"
            strokeWidth="2"
            onClick={claim}
          />
        ))}
      {token &&
        (token.merch ? (
          <circle
            cx={left + OfficeWidth / 2}
            cy={top + OfficeWidth / 2}
            r={OfficeWidth / 2 - 1}
            fill={playerColor(state.players[token.owner].color)}
            stroke="white"
            strokeWidth="2"
            onClick={claim}
          />
        ) : (
          <rect
            x={left + 2}
            y={top + 2}
            width={OfficeWidth - 4}
            height={OfficeWidth - 4}
            rx="1"
            fill={playerColor(state.players[token.owner].color)}
            stroke="white"
            strokeWidth="2"
            onClick={claim}
          />
        ))}
      {office && office.point && (
        <text className="title" fill="black" fontSize="20" fontFamily="Monospace" fontWeight="800" letterSpacing="0em">
          <tspan textAnchor="middle" x={left + OfficeWidth / 2} y={top + OfficeWidth / 2 + 6}>
            1
          </tspan>
        </text>
      )}
    </g>
  );
};

export const CityComponent = ({ cityName }: { cityName: string }) => {
  const { controller } = useContext(ControllerContext);
  const { state } = controller;
  const city = state.map.cities[cityName];
  const extras = state.cities[cityName].extras;
  const cityWidth = (city.offices.length + extras.length) * (OfficeWidth + Margin) + Margin;
  const x = city.position[0] - cityWidth / 2;
  const y = city.position[1] - (CityHeight + FontSize / 2) / 2;

  const owner = state.players[cityOwner(state, cityName)];

  return (
    <g className="city-group" style={{ transform: `translate(${x}px,${y}px)` }}>
      <g>
        <rect
          width={cityWidth}
          height={CityHeight}
          rx="6"
          fill={CityColorMap(city.color)}
          stroke={owner ? playerColor(owner.color) : "black"}
          strokeWidth="3"
        />
        {extras.map((token, i) => (
          <OfficeComponent key={i} office={null} order={i} city={city} />
        ))}
        {city.offices.map((office, i) => (
          <OfficeComponent key={i} office={office} order={extras.length + i} city={city} />
        ))}
      </g>
      <text
        className="title"
        fill="white"
        stroke={owner ? playerColor(owner.color) : "black"}
        strokeWidth="7"
        fontSize={FontSize}
        fontFamily="Monospace"
        fontWeight="800"
        letterSpacing="0em"
      >
        <tspan textAnchor="middle" x={cityWidth / 2} y={CityHeight + FontSize / 2}>
          {city.name}
        </tspan>
      </text>
      {city.upgrade && (
        <text
          className="upgrade-text"
          fill="black"
          fontSize={12}
          fontFamily="Monospace"
          fontWeight="400"
          letterSpacing="0em"
        >
          <tspan textAnchor="middle" x={cityWidth / 2} y={CityHeight + FontSize + 5}>
            {city.upgrade}
          </tspan>
        </text>
      )}
    </g>
  );
};

export const RouteComponent = ({
  from,
  to,
  posts,
  index,
}: {
  index: number;
  from: [number, number];
  to: [number, number];
  posts: number;
}) => {
  const { controller } = useContext(ControllerContext);
  const { state, action } = controller;

  // Cities can be different sizes, so we want to take into account only
  // the part of the route line which is not covered by a city.
  // We find the intersection points with the city rects and "cut" the route short.
  const { from: fromCityName, to: toCityName } = state.map.routes[index];
  const fromCity = state.map.cities[fromCityName];
  const fromExtras = state.cities[fromCityName].extras;
  const fromCityWidth = (fromCity.offices.length + fromExtras.length) * OfficeWidth + 2 * Margin;
  const fromCityRect = {
    x: fromCity.position[0] - fromCityWidth / 2,
    y: fromCity.position[1] - CityHeight / 2,
    w: fromCityWidth,
    h: CityHeight,
  };
  const toCity = state.map.cities[toCityName];
  const toExtras = state.cities[toCityName].extras;
  const toCityWidth = (toCity.offices.length + toExtras.length) * OfficeWidth + 2 * Margin;
  const toCityRect = {
    x: toCity.position[0] - toCityWidth / 2,
    y: toCity.position[1] - CityHeight / 2,
    w: toCityWidth,
    h: CityHeight,
  };

  const fromInt = rectIntersect({ from, to }, fromCityRect);
  const toInt = rectIntersect({ from, to }, toCityRect);

  if (!fromInt || !toInt) {
    console.warn(
      `The route between ${fromCityName} and ${toCityName} has no intersection with the city boxes`,
      "Probably because the cities overlap"
    );
    return <></>;
  }

  const { x: x1, y: y1 } = fromInt;
  const { x: x2, y: y2 } = toInt;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const radpct = (PostRadius / Math.sqrt(dx * dx + dy * dy)) * 2.5;

  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;

  // This is a perpenducular line to the route, passing through its center
  // We are going to place the "complete route" button on this line
  const nx1 = -y1 + cy + cx;
  const ny1 = x1 - cx + cy;
  const nx2 = -y2 + cy + cx;
  const ny2 = x2 - cx + cy;
  const ndx = nx2 - nx1;
  const ndy = ny2 - ny1;
  const nradpct = (PostRadius / Math.sqrt(ndx * ndx + ndy * ndy)) * 3;
  const ncx = cx + ndx * nradpct * (ny2 > ny1 ? 1 : -1);
  const ncy = cy + ndy * nradpct * (ny2 > ny1 ? 1 : -1);

  const isRouteFull = state.routes[index].tokens.every((t) => t?.owner === state.context.player);
  const marker = state.routes[index].marker;
  const placeMarker =
    state.context.phase === "Markers" && canPlaceBonusMarker(state, index) && getPlayer(state).unplacedMarkers[0];

  return (
    <g>
      <path d={`M${from[0]} ${from[1]} L${to[0]} ${to[1]}`} stroke="gray" strokeWidth="10" />

      {isRouteFull && controller.playerId === getPlayer(state).id && (
        <g className="complete-route" onClick={() => action("route", { route: index })}>
          <circle
            cx={ncx}
            cy={ncy}
            r={PostRadius}
            fill={playerColor(getPlayer(state).color)}
            stroke="black"
            strokeWidth={2}
          />
          <path
            style={{ transform: `translate(${ncx - 12}px, ${ncy - 12}px)` }}
            fill="black"
            stroke="white"
            strokeWidth="2"
            d="M9,20.42L2.79,14.21L5.62,11.38L9,14.77L18.88,4.88L21.71,7.71L9,20.42Z"
          />
        </g>
      )}

      {placeMarker && (
        <g className="complete-route" onClick={() => action("marker-place", { route: index })}>
          <circle cx={ncx} cy={ncy} r={PostRadius} fill="black" stroke="black" strokeWidth={2} />
          <path
            style={{ transform: `translate(${ncx - 12}px, ${ncy - 12}px)` }}
            fill="black"
            stroke="white"
            strokeWidth="2"
            d="M9,20.42L2.79,14.21L5.62,11.38L9,14.77L18.88,4.88L21.71,7.71L9,20.42Z"
          />
        </g>
      )}
      {marker && <SVGMarker kind={marker} x={cx + cx - ncx} y={cy + cy - ncy} />}

      {Array.from(Array(posts)).map((_, i) => {
        const x = x1 + dx * (0.5 + radpct * (i - posts / 2 + 0.5));
        const y = y1 + dy * (0.5 + radpct * (i - posts / 2 + 0.5));
        return <TradingPostComponent key={i} pos={{ x, y }} address={[index, i]} />;
      })}
    </g>
  );
};

export const TradingPostComponent = ({
  address,
  pos,
}: {
  address: [number, number];
  pos: { x: number; y: number };
}) => {
  const {
    ui: { merch },
    controller: { state, action },
  } = useContext(ControllerContext);
  const token = state.routes[address[0]].tokens[address[1]];
  const owner = token && state.players[token.owner];

  const onClick: MouseEventHandler<SVGGElement> = (e) => {
    const placeMerchant = getPlayer(state).personalSupply.m > 0 && (e.shiftKey || merch);

    if (state.context.phase === "Displacement") {
      if (!owner) {
        action("displace-place", { post: address });
      }
    } else if (!owner) {
      if (state.context.phase === "Collection" || state.context.phase === "Movement") {
        if (state.context.hand.length > 0) {
          action("move-place", { post: address });
        }
      } else {
        action("place", { post: address, merch: placeMerchant });
      }
    } else if (owner === getPlayer(state)) {
      action("move-collect", { post: address });
    } else {
      if (state.context.phase === "Collection" && canMoveOponnentMarkers(state)) {
        action("move-collect", { post: address });
      } else if (confirm(`Displace a ${owner.color} token? Can't undo this!`)) {
        action("displace", { post: address, merch: placeMerchant });
      }
    }
  };

  return (
    <g className="trading-post" onClick={onClick}>
      <circle cx={pos.x} cy={pos.y} r={PostRadius} fill="white" stroke="black" strokeWidth={PostRadius / 4} />
      {owner &&
        (token.merch ? (
          <circle cx={pos.x} cy={pos.y} r={PostRadius} fill={playerColor(owner.color)} strokeWidth="2" stroke="white" />
        ) : (
          <rect
            x={pos.x - PostRadius / 1.33}
            y={pos.y - PostRadius / 1.33}
            width={PostRadius * 1.5}
            height={PostRadius * 1.5}
            fill={playerColor(owner.color)}
            strokeWidth="2"
            stroke="white"
          />
        ))}
    </g>
  );
};

const getMarkerTextAndTitle = (kind: BonusMarkerKind) => {
  let text = "";
  let title = "";

  if (kind === "3 Actions") {
    text = "+3";
    title = "Gain 3 actions";
  } else if (kind === "4 Actions") {
    text = "+4";
    title = "Gain 4 actions";
  } else if (kind === "Move 3") {
    text = "move";
    title = "Move any 3 tokens occupying a trading post";
  } else if (kind === "Office") {
    text = "offc";
    title = "Extra office in a city with at least 1 office";
  } else if (kind === "Swap") {
    text = "swap";
    title = "Swap one of your offices with the next one";
  } else if (kind === "Upgrade") {
    text = "upgr";
    title = "Free upgrade";
  }
  return { text, title };
};

export const SVGMarker = ({ kind, x, y }: { kind: BonusMarkerKind; x: number; y: number }) => {
  const { text, title } = getMarkerTextAndTitle(kind);
  return (
    <g>
      <circle cx={x} cy={y} r={20} fill="#ffffcc" stroke="black" strokeWidth={2}>
        <title>{title}</title>
      </circle>
      <text
        style={{ pointerEvents: "none" }}
        fill="black"
        fontSize="14"
        fontFamily="Monospace"
        fontWeight="400"
        letterSpacing="0em"
      >
        <tspan textAnchor="middle" x={x} y={y + 4}>
          {text}
        </tspan>
      </text>
    </g>
  );
};

export const InlineMarker = ({ kind }: { kind: BonusMarkerKind }) => {
  const { controller } = useContext(ControllerContext);
  const onClick = () => controller.action("marker-use", { kind });
  const { text, title } = getMarkerTextAndTitle(kind);

  return (
    <div onClick={onClick} className="inline-marker" title={title}>
      {text}
    </div>
  );
};

export const PlayerQuickInfo = ({ player }: { player: PlayerState }) => {
  const { ui, controller } = useContext(ControllerContext);

  const state = controller.state;
  const me = controller.playerId === player.id;

  const a = player.actions;
  const k = player.keys;
  const b = player.bank;
  const p = player.privilege;
  const o = player.book;
  return (
    <div className={`player-info ${playerColor(player.color)}`}>
      <h2 style={{ color: playerColor(player.color) }}>
        {player.name}: {player.points}
        <span className="score">
          (
          {totalPoints(
            state,
            state.players.findIndex((p) => p === player)
          )}
          )
        </span>
      </h2>
      <div className="rack flex">
        <div className="left">
          {player.generalStock.t > 0 && (
            <>
              {player.generalStock.t}x <div className="token tradesman"></div>
            </>
          )}
          {player.generalStock.m > 0 && (
            <>
              &nbsp;
              {player.generalStock.m}x <div className="token merchant"></div>
            </>
          )}
        </div>
        <div className="right">
          {player.personalSupply.t > 0 && (
            <>
              {player.personalSupply.t}x
              <div
                onClick={() => me && ui.setMerch(false)}
                className={`personal token tradesman${!ui.merch && me ? " next" : ""}`}
              ></div>
            </>
          )}
          {player.personalSupply.m > 0 && (
            <>
              &nbsp;
              {player.personalSupply.m}x
              <div
                onClick={() => me && ui.setMerch(true)}
                className={`personal token merchant${ui.merch && me ? " next" : ""}`}
              ></div>
            </>
          )}
        </div>
      </div>
      <div className={`player-quickinfo ${playerColor(player.color)}`}>
        <div className="upgrades">
          Acts: 2 {a > 1 ? 3 : "⬛"} {a > 2 ? 3 : "⬛"} {a > 3 ? 4 : "⬛"} {a > 4 ? 4 : "⬛"} {a > 5 ? 4 : "⬛"} <br />
          Keys: 1 {k > 1 ? 2 : "⬛"} {k > 2 ? 2 : "⬛"} {k > 3 ? 3 : "⬛"} {a > 4 ? 4 : "⬛"} <br />
          Bank: 3 {b > 1 ? 5 : "⬛"} {b > 2 ? 7 : "⬛"} {b > 3 ? "C" : "⬛"} <br />
          Book: 2 {o > 1 ? "3" : "⚫"} {o > 2 ? "4" : "⚫"} {o > 3 ? "5" : "⚫"} <br />
          Priv: ○ {p > 1 ? "🟠" : "⬛"} {p > 2 ? "🟣" : "⬛"} {p > 3 ? "⚫" : "⬛"}
        </div>
        <div className="markers">
          {player.usedMarkers.length > 0 && <div className="inline-marker used">{player.usedMarkers.length}</div>}
          {player.readyMarkers.map((kind, i) => (
            <InlineMarker key={i} kind={kind} />
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Displays the 7/8/9/11 point barrels next to Coellen
 */
const CoellenBarrels = ({ x, y }: { x: number; y: number }) => {
  const { state } = useContext(ControllerContext).controller;

  return (
    <g style={{ transform: `translate(${x}px, ${y}px)` }}>
      <rect width="160" height="50" rx="6" fill="#ffa" stroke="black" strokeWidth="3" />
      <circle cx="25" cy="25" r="15" fill={PrivilegeColorMap[0]} stroke="black" strokeWidth="2" />
      <circle cx="60" cy="25" r="15" fill={PrivilegeColorMap[1]} stroke="black" strokeWidth="2" />
      <circle cx="95" cy="25" r="15" fill={PrivilegeColorMap[2]} stroke="black" strokeWidth="2" />
      <circle cx="130" cy="25" r="15" fill={PrivilegeColorMap[3]} stroke="black" strokeWidth="2" />

      <text fill="black" fontSize="20" fontFamily="Monospace" fontWeight="800" letterSpacing="0em">
        <tspan textAnchor="middle" x={25} y={32}>
          7
        </tspan>
      </text>

      <text fill="black" fontSize="20" fontFamily="Monospace" fontWeight="800" letterSpacing="0em">
        <tspan textAnchor="middle" x={60} y={32}>
          8
        </tspan>
      </text>

      <text fill="black" fontSize="20" fontFamily="Monospace" fontWeight="800" letterSpacing="0em">
        <tspan textAnchor="middle" x={95} y={32}>
          9
        </tspan>
      </text>

      <text fill="white" fontSize="20" fontFamily="Monospace" fontWeight="800" letterSpacing="0em">
        <tspan textAnchor="middle" x={130} y={32}>
          11
        </tspan>
      </text>

      {state.coellen
        .map((c, i) =>
          c == null ? null : (
            <circle
              key={i}
              cx={25 + i * 35}
              cy="25"
              r="13"
              fill={playerColor(state.players[c].color)}
              stroke="white"
              strokeWidth="2"
            />
          )
        )
        .filter((e) => e)}
    </g>
  );
};

/**
 * Finds an intersection point between 2 lines
 */
const lineIntersect = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  x4: number,
  y4: number
) => {
  // Check if none of the lines are of length 0
  if ((x1 === x2 && y1 === y2) || (x3 === x4 && y3 === y4)) {
    return null;
  }

  const denominator = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);

  // Lines are parallel
  if (denominator === 0) {
    return null;
  }

  const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denominator;
  const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denominator;

  // is the intersection along the segments
  if (ua < 0 || ua > 1 || ub < 0 || ub > 1) {
    return null;
  }

  // Return a object with the x and y coordinates of the intersection
  const x = x1 + ua * (x2 - x1);
  const y = y1 + ua * (y2 - y1);

  return { x, y };
};

/**
 * Finds an intersection point between a line segment and a rect.
 */
const rectIntersect = (
  line: { from: [number, number]; to: [number, number] },
  rect: { x: number; y: number; w: number; h: number }
) => {
  type Side = [number, number, number, number];
  type Rect = [Side, Side, Side, Side];
  const sides: Rect = [
    [rect.x, rect.y, rect.x + rect.w, rect.y],
    [rect.x, rect.y, rect.x, rect.y + rect.h],
    [rect.x + rect.w, rect.y, rect.x + rect.w, rect.y + rect.h],
    [rect.x, rect.y + rect.h, rect.x + rect.w, rect.y + rect.h],
  ];
  for (const side of sides) {
    const int = lineIntersect(...line.from, ...line.to, ...side);
    if (int) {
      return int;
    }
  }
  return null;
};
