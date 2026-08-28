import React, { useState } from 'react';
import WellnessHistoryScreen from '../../components/history/WellnessHistoryScreen';
import { useSleepHistory } from '../../hooks/useSleepLog';

export default function SleepHistoryScreen() {
  const [days, setDays] = useState(30);
  const history = useSleepHistory(days);
  return <WellnessHistoryScreen type="sleep" days={days} setDays={setDays} history={history} />;
}
