const K = 32

export function eloToDisplay(elo: number): string {
  const score = Math.min(10, Math.max(1, (elo - 1500) / 400 * 9 + 5))
  return score.toFixed(1)
}

export function newRatings(
  winnerElo: number,
  loserElo: number
): { winner: number; loser: number; delta: number } {
  const expected = expectedScore(winnerElo, loserElo)
  const delta = Math.round(K * (1 - expected))
  return {
    winner: winnerElo + delta,
    loser: loserElo - delta,
    delta,
  }
}

export function eloToDisplay(elo: number): string {
  const score = Math.min(10, Math.max(1, (elo - 1200) / 400 * 3 + 7))
  return score.toFixed(1)
}
