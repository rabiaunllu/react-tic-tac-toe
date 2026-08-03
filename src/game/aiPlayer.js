export function getRandomAiMove(squares) {
  const emptyIndexes = squares
    .map((square, index) => (square ? null : index))
    .filter((index) => index !== null)

  if (emptyIndexes.length === 0) {
    return null
  }

  const randomIndex = Math.floor(Math.random() * emptyIndexes.length)
  return emptyIndexes[randomIndex]
}