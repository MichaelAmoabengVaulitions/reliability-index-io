import { TransactionsScreen } from '@/screens/TransactionsScreen';
import { UsersGate } from '@/selection/UsersGate';

export default function TransactionsScreenRoute() {
  return (
    <UsersGate>
      <TransactionsScreen />
    </UsersGate>
  );
}
