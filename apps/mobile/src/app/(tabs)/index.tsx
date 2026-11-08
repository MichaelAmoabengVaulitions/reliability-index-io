import { ScoreScreen } from '@/screens/ScoreScreen';
import { UsersGate } from '@/selection/UsersGate';

export default function ScoreScreenRoute() {
  return (
    <UsersGate>
      <ScoreScreen />
    </UsersGate>
  );
}
