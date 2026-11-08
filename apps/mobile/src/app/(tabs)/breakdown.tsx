import { BreakdownScreen } from '@/screens/BreakdownScreen';
import { UsersGate } from '@/selection/UsersGate';

export default function BreakdownScreenRoute() {
  return (
    <UsersGate>
      <BreakdownScreen />
    </UsersGate>
  );
}
