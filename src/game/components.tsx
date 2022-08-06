import React, { MouseEventHandler, useContext, useEffect, useRef, useState } from "react";
import { BonusMarkerKind, City, initGameState, Office, PlayerState } from "./model";
import {
  availableActionsCount,
  canEndTurn,
  canMoveOponnentMarkers,
  canPlaceBonusMarker,
  cityOwner,
  getPlayer,
  incomeValue,
  isCityFull,
  times,
} from "./helpers";
import { defaultClient, GameClient, useClient } from "./client";

// Nice yellow: #EEBC1D
const PrivilegeColorMap = ["white", "#F2AC29", "#99649A", "gray"];
const CityColorMap = (color: City["color"]) => (color === "red" ? "#faa" : color === "yellow" ? "#ffa" : "white");
const FontSize = 24;
const CityHeight = 64;
const RectWidth = 36;
const CircleWidth = 40;
const OfficeWidth = 48;
const Margin = 8;
const PostRadius = 14;

type UIState = {
  merch: boolean;
  setMerch: (merch: boolean) => void;
};

const ClientContext = React.createContext<{ client: GameClient; ui: UIState }>({
  client: defaultClient,
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
    <ClientContext.Provider
      value={{
        client: { state: testState, action: () => {}, reset: () => {}, playerId: "red" },
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
    </ClientContext.Provider>
  );
};

/**
 * Renders the entire application.
 * Takes a GameState as an input parameter
 */
export const App = ({ gameId, playerId }: { gameId: string; playerId: string }) => {
  const client = useClient(gameId, playerId);
  const { groupRef, svgRef, scale, x, y, panStart, pan, panEnd, zoom } = usePanZoom(!!client);
  const [merch, setMerch] = useState(false);

  useEffect(() => {
    if (player) {
      setMerch((player.personalSupply.m > 0 && merch) || player.personalSupply.t === 0);
    }
  });

  if (!client) {
    return <div>Loading ... </div>;
  }

  const { map, players, cities } = client.state;
  const player = players.find((p) => p.id === client.playerId)!;

  return (
    <ClientContext.Provider value={{ client, ui: { merch, setMerch } }}>
      <div id="container">
        <div id="ui">
          <div id="gameinfo">
            Markers: {client.state.markers.length} | Full Cities:{" "}
            {Object.keys(cities).filter((c) => isCityFull(client.state, c)).length}/10
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
    </ClientContext.Provider>
  );
};

export const PlayerControls = () => {
  const { client } = useContext(ClientContext);
  const { state, action, reset, playerId } = client;
  const me = state.players.find((p) => p.id === playerId)!;
  const currentPlayer = getPlayer(state);

  const acts = availableActionsCount(state) - state.current.actions.filter((a) => a.name !== "marker-use").length;
  const { phase } = state.current;

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
          : "Invalid state"}
      </div>

      {me === currentPlayer && (
        <>
          {state.current.hand.length > 0 && (
            <div className={`hand ${me.color}`}>
              {state.current.hand.map((t, i) => (
                <div
                  key={i}
                  className={`token ${t.token === "m" ? "merchant" : "tradesman"} ${state.players[t.owner].color}`}
                />
              ))}
            </div>
          )}

          <div className="buttons">
            {phase === "Actions" && acts > 0 && (
              <button onClick={() => action("income")}>Purchase {incomeValue(state)} tokens</button>
            )}
            {state.current.rewards?.map((r, i) => (
              <button key={i} onClick={() => action(r.action.name, r.action.params)}>
                {r.title}
              </button>
            ))}
          </div>

          <div className="buttons">
            <button onClick={() => reset()}>Reset Turn</button>
            {canEndTurn(state) && <button onClick={() => action("done")}>End Turn</button>}
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

export const OfficeComponent = ({ office, order, city }: { office: Office; order: number; city: City }) => {
  const width = office.merch ? CircleWidth : RectWidth;
  const left = Margin + order * OfficeWidth + (OfficeWidth - width) / 2;
  const top = (CityHeight - width) / 2;

  const { state, action } = useContext(ClientContext).client;
  const index = city.offices.indexOf(office);
  const token = state.cities[city.name].tokens[index];

  const claim = () => {
    if (index === state.cities[city.name].tokens.length) {
      action("route-office", { city: city.name });
    }
  };

  return (
    <g>
      {office.merch ? (
        <circle
          cx={left + width / 2}
          cy={top + width / 2}
          r={width / 2}
          fill={PrivilegeColorMap[office.color]}
          stroke="black"
          strokeWidth="2"
          onClick={claim}
        />
      ) : (
        <rect
          x={left}
          y={top}
          width={width}
          height={width}
          rx="1"
          fill={PrivilegeColorMap[office.color]}
          stroke="black"
          strokeWidth="2"
          onClick={claim}
        />
      )}
      {token &&
        (token.merch ? (
          <circle
            cx={left + PostRadius * 1.45}
            cy={top + PostRadius * 1.45}
            r={PostRadius * 1.25}
            fill={state.players[token.owner].color}
            stroke="white"
            strokeWidth="2"
            onClick={claim}
          />
        ) : (
          <rect
            x={left + PostRadius / 4}
            y={top + PostRadius / 4}
            width={PostRadius * 2}
            height={PostRadius * 2}
            rx="1"
            fill={state.players[token.owner].color}
            stroke="white"
            strokeWidth="2"
            onClick={claim}
          />
        ))}
      {office.point && (
        <text className="title" fill="black" fontSize="20" fontFamily="Monospace" fontWeight="800" letterSpacing="0em">
          <tspan textAnchor="middle" x={left + width / 2} y={top + width / 2 + 6}>
            1
          </tspan>
        </text>
      )}
    </g>
  );
};

export const CityComponent = ({ cityName }: { cityName: string }) => {
  const { client } = useContext(ClientContext);
  const { state } = client;
  const city = state.map.cities[cityName];
  const cityWidth = city.offices.length * OfficeWidth + 2 * Margin;
  const x = city.position[0] - cityWidth / 2;
  const y = city.position[1] - (CityHeight + FontSize / 2) / 2;

  const owner = state.players[cityOwner(state, cityName)];

  return (
    <g className="city-group" style={{ transform: `translate(${x}px,${y}px)` }}>
      <g>
        <rect
          x="0"
          y="0"
          width={cityWidth}
          height={CityHeight}
          rx="6"
          fill={CityColorMap(city.color)}
          stroke={owner ? owner.color : "black"}
          strokeWidth="3"
        />
        {city.offices.map((office, i) => (
          <OfficeComponent key={i} office={office} order={i} city={city} />
        ))}
      </g>
      <text
        className="title"
        fill="white"
        stroke={owner ? owner.color : "black"}
        strokeWidth="7"
        fontSize={FontSize}
        fontFamily="Monospace"
        fontWeight="800"
        letterSpacing="0em"
      >
        <tspan textAnchor="middle" x={cityWidth / 2} y={CityHeight + FontSize / 2 - 5}>
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
          <tspan textAnchor="middle" x={cityWidth / 2} y={CityHeight + FontSize}>
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
  const { client } = useContext(ClientContext);
  const { state, action } = client;

  // Cities can be different sizes, so we want to take into account only
  // the part of the route line which is not covered by a city.
  // We find the intersection points with the city rects and "cut" the route short.
  const { from: fromCityName, to: toCityName } = state.map.routes[index];
  const fromCity = state.map.cities[fromCityName];
  const fromCityWidth = fromCity.offices.length * OfficeWidth + 2 * Margin;
  const fromCityRect = {
    x: fromCity.position[0] - fromCityWidth / 2,
    y: fromCity.position[1] - CityHeight / 2,
    w: fromCityWidth,
    h: CityHeight,
  };
  const toCity = state.map.cities[toCityName];
  const toCityWidth = toCity.offices.length * OfficeWidth + 2 * Margin;
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

  const isRouteFull = state.routes[index].tokens.every((t) => t?.owner === state.current.player);
  const marker = state.routes[index].marker;
  const placeMarker =
    state.current.phase === "Markers" && canPlaceBonusMarker(state, index) && getPlayer(state).unplacedMarkers[0];

  return (
    <g>
      <path d={`M${from[0]} ${from[1]} L${to[0]} ${to[1]}`} stroke="gray" strokeWidth="10" />

      {isRouteFull && (
        <g className="complete-route" onClick={() => action("route", { route: index })}>
          <circle cx={ncx} cy={ncy} r={PostRadius} fill={getPlayer(state).color} stroke="black" strokeWidth={2} />
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
    client: { state, action },
  } = useContext(ClientContext);
  const token = state.routes[address[0]].tokens[address[1]];
  const owner = token && state.players[token.owner];

  const onClick: MouseEventHandler<SVGGElement> = (e) => {
    const placeMerchant = getPlayer(state).personalSupply.m > 0 && (e.shiftKey || merch);

    if (state.current.phase === "Displacement") {
      if (!owner) {
        action("displace-place", { post: address });
      }
    } else if (!owner) {
      if (state.current.phase === "Collection" || state.current.phase === "Movement") {
        if (state.current.hand.length > 0) {
          action("move-place", { post: address });
        }
      } else {
        action("place", { post: address, merch: placeMerchant });
      }
    } else if (owner === getPlayer(state)) {
      action("move-collect", { post: address });
    } else {
      if (state.current.phase === "Collection" && canMoveOponnentMarkers(state)) {
        action("move-collect", { post: address });
      } else {
        // TODO: show an alert to notify that control passes to another player
        action("displace", { post: address, merch: placeMerchant });
      }
    }
  };

  return (
    <g className="trading-post" onClick={onClick}>
      <circle cx={pos.x} cy={pos.y} r={PostRadius} fill="white" stroke="black" strokeWidth={PostRadius / 4} />
      {owner &&
        (token.merch ? (
          <circle cx={pos.x} cy={pos.y} r={PostRadius} fill={owner.color} strokeWidth="2" stroke="white" />
        ) : (
          <rect
            x={pos.x - PostRadius / 1.33}
            y={pos.y - PostRadius / 1.33}
            width={PostRadius * 1.5}
            height={PostRadius * 1.5}
            fill={owner.color}
            strokeWidth="2"
            stroke="white"
          />
        ))}
    </g>
  );
};

export const SVGMarker = ({ kind, x, y }: { kind: BonusMarkerKind; x: number; y: number }) => {
  const text =
    kind === "3 Actions"
      ? "+3"
      : kind === "4 Actions"
      ? "+4"
      : kind === "Move 3"
      ? "move"
      : kind === "Place"
      ? "offc"
      : kind === "Swap"
      ? "swap"
      : kind === "Upgrade"
      ? "upgr"
      : null;
  return (
    <g>
      <circle cx={x} cy={y} r={20} fill="#ffffcc" stroke="black" strokeWidth={2} />
      <text fill="black" fontSize="14" fontFamily="Monospace" fontWeight="400" letterSpacing="0em">
        <tspan textAnchor="middle" x={x} y={y + 4}>
          {text}
        </tspan>
      </text>
    </g>
  );
};

export const InlineMarker = ({ kind }: { kind: BonusMarkerKind }) => {
  const { client } = useContext(ClientContext);
  const onClick = () => client.action("marker-use", { kind });
  const text =
    kind === "3 Actions"
      ? "+3"
      : kind === "4 Actions"
      ? "+4"
      : kind === "Move 3"
      ? "move"
      : kind === "Place"
      ? "offc"
      : kind === "Swap"
      ? "swap"
      : kind === "Upgrade"
      ? "upgr"
      : null;
  return (
    <div onClick={onClick} className="inline-marker">
      {text}
    </div>
  );
};

export const PlayerQuickInfo = ({ player }: { player: PlayerState }) => {
  const { ui, client } = useContext(ClientContext);

  const me = client.playerId === player.id;

  const a = player.actions;
  const k = player.keys;
  const b = player.bank;
  const p = player.privilege;
  const o = player.book;
  return (
    <div className={`player-info ${player.color}`}>
      <h2 style={{ color: player.color }}>
        {player.name}: {player.points}
        <span className="score">(27)</span>
      </h2>
      <div className="rack">
        {player.generalStock.t > 0 && (
          <>
            {player.generalStock.t}x <div className="token tradesman"></div>
          </>
        )}
        &nbsp;
        {player.generalStock.m > 0 && (
          <>
            {player.generalStock.m}x <div className="token merchant"></div>
          </>
        )}
        {" | "}
        {player.personalSupply.t > 0 && (
          <>
            {player.personalSupply.t}x
            <div
              onClick={() => me && ui.setMerch(false)}
              className={`personal token tradesman${!ui.merch && me ? " next" : ""}`}
            ></div>
          </>
        )}
        &nbsp;
        {player.personalSupply.m > 0 && (
          <>
            {player.personalSupply.m}x
            <div
              onClick={() => me && ui.setMerch(true)}
              className={`personal token merchant${ui.merch && me ? " next" : ""}`}
            ></div>
          </>
        )}
      </div>
      <div className={`player-quickinfo ${player.color}`}>
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
