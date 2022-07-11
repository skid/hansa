import { useRouter } from "next/router";
import { App } from "~src/game/components";

function PlayPage() {
  const router = useRouter();
  return <App gameId={router.query.gameId as string} playerId={router.query.playerId as string} />;
}

export default PlayPage;
