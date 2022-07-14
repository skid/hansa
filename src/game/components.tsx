import React, { useContext, useState } from "react";
import { City, Office } from "./model";
import { availableActionsCount, cityOwner, getPlayer, times } from "./helpers";
import { defaultClient, GameClient, useClient } from "./client";

const PrivilegeColorMap = ["white", "#F2AC29", "#99649A", "gray"];
const FontSize = 24;
const CityHeight = 64;
const RectWidth = 32;
const CircleWidth = 40;
const OfficeWidth = 48;
const Margin = 8;
const PostRadius = 16;

type UIState = {
  merch: boolean;
};

const ClientContext = React.createContext<{ client: GameClient; ui: UIState }>({
  client: defaultClient,
  ui: { merch: false },
});

// Hook to access the client context
const useGameClient = () => {
  return useContext(ClientContext).client
} 

/**
 * Renders the entire application.
 * Takes a GameState as an input parameter
 */
export const App = ({ gameId, playerId }: { gameId: string; playerId: string }) => {
  const client = useClient(gameId, playerId);
  const [merch, setMerch] = useState(false);

  if (!client) {
    return <div>Loading ... </div>;
  }

  const { map, players } = client.state;

  const currentPlayer = getPlayer(client.state);


  return (
    <ClientContext.Provider value={{ client, ui: { merch } }}>
      <div id="container">
        <h1>Hansa Teutonica</h1>
        <svg id="map">
          {/* TODO: Make a pan and zoom hook (with some limits) */}
          <g id="game" transform={`scale(1,1), translate(0,0)`}>
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

        {currentPlayer.id === playerId ? <PlayerControls merch={merch} setMerch={setMerch} /> : null}

        <div id="players">
          {players.map((_, i) => (
            <PlayerComponent key={i} i={i} />
          ))}
        </div>
      </div>
    </ClientContext.Provider>
  );
};

export const PlayerControls = ({ merch, setMerch }: { merch: boolean; setMerch: (m: boolean) => void }) => {
  const { state, action } = useGameClient();
  const player = getPlayer(state);
  const acts = availableActionsCount(state) - state.current.actions.length;
  const { phase } = state.current;


  return (
    <div className={`player-controls ${player.color}`}>
      <div className="info">
        {phase === "Actions"
          ? acts
            ? `Take actions (${acts} left)`
            : `No actions left. End turn?`
          : phase === "Displacement"
          ? acts
            ? `Place displaced tokens (${acts} left)`
            : `You're done placing. End turn?`
          : phase === "Collection"
          ? "Collect tokens to move"
          : phase === "Movement"
          ? "Place collected tokens"
          : phase === "Route"
          ? "Route complete, choose reward"
          : "Invalid state"}

        <span className="btn">↩️</span>
        <span className="btn">↪️</span>
      </div>
      <div className="actions">
        <div className={`next-token ${player.color}${merch ? " merchant" : ""}`} onClick={() => setMerch(!merch)} />

        <div className="action-options">
          {phase === "Actions" && (
            <a className="link" onClick={() => action("income")}>
              Income
            </a>
          )}
          {phase === "Route" &&
            state.current.rewards?.map((r, i) => (
              <a key={i} className="link" onClick={() => action(r.action.name, r.action.params)}>
                {r.title}
              </a>
            ))}
        </div>

        <div className="end-turn">
          <button onClick={() => action("done")}>End Turn</button>
          <div className="hand">
            {state.current.hand.map((t, i) => (
              <div key={i} className={`token ${t === "m" ? "merchant" : "tradesman"}`} />
            ))}
          </div>
        </div>
      </div>
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
          stroke={office.point ? "#EEBC1D" : "black"}
          strokeWidth={office.point ? "5" : "2"}
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
          stroke={office.point ? "#EEBC1D" : "black"}
          strokeWidth={office.point ? "5" : "2"}
          onClick={claim}
        />
      )}
      {token &&
        (token.merch ? (
          <circle
            cx={left + PostRadius * 1.25}
            cy={top + PostRadius * 1.25}
            r={PostRadius}
            fill={state.players[token.owner].color}
            stroke="white"
            strokeWidth="2"
            onClick={claim}
          />
        ) : (
          <rect
            x={left + PostRadius / 4}
            y={top + PostRadius / 4}
            width={PostRadius * 1.5}
            height={PostRadius * 1.5}
            rx="1"
            fill={state.players[token.owner].color}
            stroke="white"
            strokeWidth="2"
            onClick={claim}
          />
        ))}
    </g>
  );
};

export const CityComponent = ({ cityName }: { cityName: string }) => {
  const { client } = useContext(ClientContext);
  const { state } = client;
  const city = state.map.cities[cityName];
  const cityState = state.cities[cityName];

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
          fill="white"
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
  const [x1, y1] = from;
  const [x2, y2] = to;
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
  const nradpct = (PostRadius / Math.sqrt(ndx * ndx + ndy * ndy)) * 2.5;
  const ncx = cx + ndx * nradpct * (ny2 > ny1 ? 1 : -1);
  const ncy = cy + ndy * nradpct * (ny2 > ny1 ? 1 : -1);

  const { client } = useContext(ClientContext);
  const { state, action } = client;
  const isRouteFull = state.routes[index].tokens.every((t) => t?.owner === state.current.player);

  return (
    <g>
      <path d={`M${x1} ${y1} L${x2} ${y2}`} stroke="black" strokeWidth="15" />

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

  const onClick = () => {
    if (state.current.phase === "Displacement") {
      if (!owner) {
        action("displace-place", { post: address });
      }
    } else if (!owner) {
      if (state.current.phase === "Collection" || state.current.phase === "Movement") {
        action("move-place", { post: address });
      } else {
        action("place", { post: address, merch });
      }
    } else if (owner === getPlayer(state)) {
      action("move-collect", { post: address });
    } else {
      // TODO: show an alert to notify that control passes to another player
      action("displace", { post: address, merch });
    }
  };

  return (
    <g className="trading-post" onClick={onClick}>
      <circle cx={pos.x} cy={pos.y} r={PostRadius} fill="white" stroke="black" strokeWidth={PostRadius / 2} />
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

export const PlayerComponent = ({ i }: { i: number }) => {
  const { state, playerId } = useContext(ClientContext).client;
  const player = state.players[i];
  const you = state.players.find((p) => p.id === playerId);

  return (
    <div className={`player-ui ${player.color}`}>
      <h3>
        {i === state.current.player && ">> "}
        {player === you ? "YOU" : player.name}: {player.points}
      </h3>
      <div className="box">
        <div className="tokens">
          <div className="rack">
            {times(player.generalStock.t, (i) => (
              <div key={i} className="token tradesman"></div>
            ))}
            {times(player.generalStock.m, (i) => (
              <div key={i} className="token merchant"></div>
            ))}
          </div>
          <div className="rack">
            {times(player.personalSupply.t, (i) => (
              <div key={i} className="token tradesman"></div>
            ))}
            {times(player.personalSupply.m, (i) => (
              <div key={i} className="token merchant"></div>
            ))}
          </div>
        </div>
        <div className="upgrades">
          Acts: {player.actions} <br />
          Priv: {player.privilege} <br />
          Book: {player.book} <br />
          Bank: {player.bank} <br />
          Keys: {player.keys}
        </div>
      </div>
    </div>
  );
};
