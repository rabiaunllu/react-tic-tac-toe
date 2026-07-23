/*Bu component sadece yazıdan sorumlu. Oyun kuralını hesaplamıyor,
 sadece gelen bilgiye göre ekrana metin basıyor.*/

export default function GameStatus({ winner, isDraw, xIsNext }) {
  if (winner) {
    return <div className="status winner">Kazanan: {winner}. Bu hamle biraz saygısızcaydı.</div>
  }

  if (isDraw) {
    return <div className="status draw">Berabere. İkiniz de fazla temkinlisiniz.</div>
  }

  return <div className="status">Sıradaki oyuncu: {xIsNext ? 'X' : 'O'}</div>
}