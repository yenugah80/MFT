import React, { useState } from 'react';
import WellnessHistoryScreen from '../../components/history/WellnessHistoryScreen';
import { useStressHistory } from '../../hooks/useStressLog';

export default function StressHistoryScreen() {
  const [days, setDays] = useState(30);
  const history = useStressHistory(days);
  return <WellnessHistoryScreen type="stress" days={days} setDays={setDays} history={history} />;
}
