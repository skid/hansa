import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { App } from "~src/game/components";

function PlayPage() {
  const router = useRouter();
  return <App gameId={router.query.gameId as string} playerId={router.query.playerId as string} />;
}

export default dynamic(() => Promise.resolve(PlayPage), { ssr: false });
