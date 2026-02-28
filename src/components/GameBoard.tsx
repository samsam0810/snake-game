import { useEffect } from 'react'
import './GameBoard.css'
import { useSnakeGame } from './useSnakeGame'
import type { Direction, GameStatus } from './useSnakeGame'

const GRID_SIZE = 20
const BOARD_SIZE = GRID_SIZE * GRID_SIZE

function StatusHint({ gameStatus }: { gameStatus: GameStatus }) {
  switch (gameStatus) {
    case 'playing':
      return <span className="game-over">Playing (空白鍵暫停)</span>
    case 'paused':
      return <span className="game-over">Paused (空白鍵繼續)</span>
    case 'gameOver':
      return <span className="game-over">Game Over</span>
    default:
      return null
  }
}

export function GameBoard() {
  const {
    snake,
    snakeSet,
    food,
    score,
    gameStatus,
    direction,
    startGame,
    togglePause,
    setDirection,
    bgmVolume,
    setBgmVolume,
    wallEnabled,
    speedPowerups,
    wallRef,
    invincibleStar,
    isInvincible,
    toggleMute,
    isMuted,
  } = useSnakeGame()

  const cells = Array.from({ length: BOARD_SIZE })

  // 鍵盤控制方向與暫停
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // 空白鍵：在 playing / paused 之間切換
      if (event.key === ' ') {
        event.preventDefault()
        if (gameStatus === 'playing' || gameStatus === 'paused') {
          togglePause()
        }
        else if(gameStatus === 'idle' || gameStatus === 'gameOver'){
          startGame() // 空白鍵也能啟動或重新開始
        }
        return
      }

      if (gameStatus !== 'playing') return

      const keyMap: Record<string, Direction> = {
        ArrowUp: 'up',
        ArrowDown: 'down',
        ArrowLeft: 'left',
        ArrowRight: 'right',
      }

      const newDir = keyMap[event.key]
      if (newDir) setDirection(newDir)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [gameStatus, togglePause, setDirection])

  const nextAppearScore = wallRef.current.nextScore
  const nextDisappearScore = wallRef.current.nextScore + 5
  return (
    <div className="game-container">
      <div className="game-info">
        <div className="game-info-row">
          <span className="score">Score: {score}</span>
          <StatusHint gameStatus={gameStatus} />
        </div>

        {gameStatus === 'idle' && (
          <button className="restart-button" onClick={startGame}>
            Start
          </button>
        )}
        {gameStatus === 'gameOver' && (
          <button className="restart-button" onClick={startGame}>
            Restart
          </button>
        )}
      </div>
      <div className="game-board-wrapper">
            {/* 左側音量控制 */}
        <div className="volume-control">
          <label htmlFor="bgmVolume">遊戲音量</label>
          <input
            type="range"
            id="bgmVolume"
            min={0}
            max={100}
            value={bgmVolume * 100}
            onChange={(e) => setBgmVolume(Number(e.target.value) / 100)}
          />
          {/* 一鍵靜音/恢復按鈕 */}
          <button className="mute-button" onClick={toggleMute}>
            <span className="icon">{isMuted ? '🔇' : '🔊'}</span>
            {isMuted ? '靜音' : '音量'}
          </button>
        </div>
        {/* 右側牆提示 */}
        {speedPowerups.length > 0 && (
          <div className="speed-hint">
            加速道具(黃色)出現(持續10秒)，速度將變為兩倍持續3秒！
          </div>
        )}
        <div className="wall-hint">
          {gameStatus !== 'idle' && (
            <div>
              {
                wallEnabled 
                ? `當分數達到 ${nextDisappearScore} 時牆將消失`
                : `下一面牆將在分數 ${nextAppearScore} 出現`
              }
            </div>
          )}
        </div>
      <div className="game-board-container">
      <div className="game-board">
        {cells.map((_, index) => {
            const row = Math.floor(index / GRID_SIZE)
            const col = index % GRID_SIZE

            const isSnakeHead = snake[0] === index
            const isSnakeBody = snakeSet.has(index) && !isSnakeHead
            const isFood = food === index
            const isSpeed = speedPowerups.includes(index)

            const classes = ['game-cell']

            // === 最外圍牆線 ===
            if (wallEnabled) {
              if (row === 0) classes.push('top-edge')
              if (row === GRID_SIZE - 1) classes.push('bottom-edge')
              if (col === 0) classes.push('left-edge')
              if (col === GRID_SIZE - 1) classes.push('right-edge')
            }

            // === 蛇與食物與星星 ===
            const isStar = invincibleStar === index
            if (isSnakeHead) classes.push('snakeHead', direction)
            else if (isSnakeBody) classes.push('snake')
            else if (isFood) classes.push('food')
            else if (isSpeed) classes.push('speed-powerup')
            else if (isStar) classes.push('invincible-star')

            if (isInvincible && (isSnakeHead || isSnakeBody)) {
              classes.push('invincible');
            }
            return <div key={index} className={classes.join(' ')} />
          })}
        </div>
      </div>
      </div>
    </div>
  )
}

export default GameBoard
