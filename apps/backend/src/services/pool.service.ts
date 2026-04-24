export type PoolBet = {
  id: string;
  amount: number;
  outcomeId: string;
};

export type PoolPayout = {
  betId: string;
  payout: number;
  won: boolean;
};

export function calculatePoolPayouts(bets: PoolBet[], winningOutcomeId: string, platformFeeRate = 0.1): PoolPayout[] {
  const totalPool = bets.reduce((sum, bet) => sum + bet.amount, 0);
  const platformFee = Math.floor(totalPool * platformFeeRate);
  const distributablePool = Math.max(0, totalPool - platformFee);
  const winningPool = bets.filter((bet) => bet.outcomeId === winningOutcomeId).reduce((sum, bet) => sum + bet.amount, 0);

  return bets.map((bet) => {
    const won = bet.outcomeId === winningOutcomeId && winningPool > 0;
    const payout = won ? Math.floor((bet.amount / winningPool) * distributablePool) : 0;
    return { betId: bet.id, payout, won };
  });
}
