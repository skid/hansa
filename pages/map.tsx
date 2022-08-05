import dynamic from "next/dynamic";
import { Map } from "~src/game/components";

function MapPage() {
  return <Map />;
}

export default dynamic(() => Promise.resolve(MapPage), { ssr: false });
