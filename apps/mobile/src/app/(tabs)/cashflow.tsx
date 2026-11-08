import { CashflowScreen } from '@/screens/CashflowScreen';
import { UsersGate } from '@/selection/UsersGate';

export default function CashflowScreenRoute() {
  return (
    <UsersGate>
      <CashflowScreen />
    </UsersGate>
  );
}
