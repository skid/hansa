import { useRouter } from "next/router";
import { Chat } from "~src/chat";
import { App } from "~src/game/components";

function PlayPage() {
  const router = useRouter();
  const gameId = router.query.gameId as string;
  const playerId = router.query.playerId as string;

  return (
    <>
      <App gameId={gameId} playerId={playerId} />
      <Chat gameId={gameId} playerId={playerId} />
    </>
  );
}

export default PlayPage;
