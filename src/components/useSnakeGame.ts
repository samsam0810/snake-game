import { useCallback, useEffect, useRef, useState } from 'react'
import { useGameAudio } from './useGameAudio'
import { usePowerups } from './usePowerups'
import { useGameScore } from './useGameScore'
import { useDirection } from './useDirection'
import { useBoost } from './useBoost'

const GRID_SIZE = 20
const BOARD_SIZE = GRID_SIZE * GRID_SIZE

export type GameStatus = 'idle' | 'playing' | 'paused' | 'gameOver'


const INITIAL_SNAKE: number[] = [42, 41, 40]


function getRandomFood(snakeSet: Set<number>, wallEnabled: boolean): number {
  let food: number
  do {
    food = Math.floor(Math.random() * BOARD_SIZE)
  } while (snakeSet.has(food) || (wallEnabled && isWallCell(food)))
  return food
}

function isWallCell(index: number) {
  const row = Math.floor(index / GRID_SIZE)
  const col = index % GRID_SIZE
  return row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE
}


export function useSnakeGame() {
  const {
    isMuted,
    volume: bgmVolume,
    setVolume: setBgmVolume,
    toggleMute,
    playBgm,
    pauseBgm,
    resetBgm,
    playEat,
    playGameOver,
  } = useGameAudio()

  const [gameEvent, setGameEvent] = useState<null | 'eat'>(null)

  const [snake, setSnake] = useState<number[]>(INITIAL_SNAKE)
  const snakeRef = useRef<number[]>(INITIAL_SNAKE)
  const [snakeSet, setSnakeSet] = useState<Set<number>>(new Set(INITIAL_SNAKE))

  const foodRef = useRef<number>(getRandomFood(new Set(INITIAL_SNAKE), false))
  const [food, setFood] = useState<number>(foodRef.current)

  const { score, highScore, updateScore, resetScore } = useGameScore()

  const [gameStatus, setGameStatus] = useState<GameStatus>('idle')

  const { 
    direction, 
    handleSetDirection, 
    getNextDirection, 
    resetDirection 
  } = useDirection()

  // === 新增：牆模式 state & ref ===
  const [wallEnabled, setWallEnabled] = useState(false)
  const wallRef = useRef({ nextScore: 10, interval: 15 }) // 初始牆出現分數 10，間隔 15

  const {
    speedPowerups,
    spawnSpeedPowerup,
    eatSpeedPowerup, 
    invincibleStar,
    isInvincible,
    handleEatInvincibleStar,
    starRemaining,
    pausePowerups,
    resumePowerups,
    resetPowerups
  } = usePowerups(snakeSet, food)


  useEffect(() => {
    if (gameStatus === 'playing') {
      playBgm()
    }
    if(gameStatus === 'paused'){
      pauseBgm()
    }
    if(gameStatus === 'gameOver'){
      pauseBgm()
      resetBgm()
      playGameOver()
      pausePowerups()
    }
  }, [gameStatus, playBgm, pauseBgm, resetBgm, playGameOver, pausePowerups])

  useEffect(() => {
  if (gameEvent === 'eat') {
    playEat()
    setGameEvent(null)  
  }
}, [gameEvent, playEat])

  const { 
    isBoosted, 
    triggerBoost, 
    pauseBoost, 
    resumeBoost, 
    resetBoost 
  } = useBoost()

  const startGame = useCallback(() => {
    const initialSet = new Set(INITIAL_SNAKE)
    snakeRef.current = INITIAL_SNAKE // 同步更新 ref
    setSnake(INITIAL_SNAKE)
    setSnakeSet(initialSet)

    resetDirection()


    setFood(getRandomFood(initialSet, wallEnabled))
    resetScore() 
    setGameStatus('playing')
    setWallEnabled(false)
    wallRef.current = { nextScore: 10, interval: 15 }

    resetBoost()

     // 重置道具並啟動無敵星星倒數
    resetPowerups() 
  }, [wallEnabled, resetPowerups])



  // 暫停時：
    const togglePause = useCallback(() => {
      setGameStatus((prev) => {
        if (prev === 'playing') {
          pausePowerups()
          pauseBoost()
          return 'paused'
        }
        if (prev === 'paused'){
          resumePowerups()
          resumeBoost()
          return 'playing'
        }
        return prev
      })
    }, [pausePowerups, resumePowerups, pauseBoost, resumeBoost])


  // 自動移動與吃食物與死亡判定
  useEffect(() => {
    if (gameStatus !== 'playing') {
      return
    }

    const gameTick = () => {
      // 取得方向
      const actualDir = getNextDirection()

      const prevSnake = snakeRef.current
      const head = prevSnake[0]
      let newHead = head
        
      // === 判斷牆撞擊 ===
      const isAtWall = 
        (actualDir === 'right' && head % GRID_SIZE === GRID_SIZE - 1) ||
        (actualDir === 'left' && head % GRID_SIZE === 0) ||
        (actualDir === 'up' && head < GRID_SIZE) ||
        (actualDir === 'down' && head >= GRID_SIZE * (GRID_SIZE - 1))

      if (wallEnabled && isAtWall && !isInvincible) {
        setGameStatus('gameOver')
        return
      }

      switch (actualDir) {
        case 'right': {
          const atRightEdge = head % GRID_SIZE === GRID_SIZE - 1
          if (wallEnabled && atRightEdge && !isInvincible) {
            setGameStatus('gameOver')
            return
          }
          //正常移動
          newHead = atRightEdge ? head - (GRID_SIZE - 1) : head + 1
          break
        }
        case 'left': {
          const atLeftEdge = head % GRID_SIZE === 0
          if (wallEnabled && atLeftEdge && !isInvincible) {
            setGameStatus('gameOver')
            return
          }
          newHead = atLeftEdge ? head + (GRID_SIZE - 1) : head - 1
          break
        }
        case 'up': {
          const atTopEdge = head < GRID_SIZE
          if (wallEnabled && atTopEdge && !isInvincible) {
          setGameStatus('gameOver')
          return
          }
           newHead = atTopEdge ? head + GRID_SIZE * (GRID_SIZE - 1) : head - GRID_SIZE
          break
        }
        case 'down': {
          const atBottomEdge = head >= GRID_SIZE * (GRID_SIZE - 1)
          if (wallEnabled && atBottomEdge && !isInvincible) {
            setGameStatus('gameOver')
            return
          }
          newHead = atBottomEdge ? head % GRID_SIZE : head + GRID_SIZE
          break
        }
      }

        const willEat = newHead === food
        const newSnake = willEat
          ? [newHead, ...prevSnake]
          : [newHead, ...prevSnake.slice(0, -1)]

        const snakeBody = new Set(newSnake.slice(1))
        if (snakeBody.has(newHead) && !isInvincible) {
          setGameStatus('gameOver')
          return
        }
      
        // 更新 snakeRef，給下一次 interval 用
        snakeRef.current = newSnake
        // 同步更新所有 state 給畫面渲染
        setSnake(newSnake)
        setSnakeSet(new Set(newSnake))


        // === 吃到食物 ===
      if (willEat) {
        setGameEvent('eat')
        const nextScore = score + 1
        updateScore(nextScore)

        // 1. 解決問題 3：預先計算當下最新的牆壁狀態
        let currentWallActive = wallEnabled
        if (!wallEnabled && nextScore === wallRef.current.nextScore) {
          setWallEnabled(true)
          currentWallActive = true // 標記為有牆
        } else if (wallEnabled && nextScore === wallRef.current.nextScore + 5) {
          setWallEnabled(false)
          currentWallActive = false // 標記為無牆
          wallRef.current.nextScore += wallRef.current.interval
          wallRef.current.interval += 5
        }

        if (nextScore % 5 === 0) {
          spawnSpeedPowerup()
        }

        setFood(getRandomFood(new Set(newSnake), currentWallActive))
      }

      if (newHead === invincibleStar) {
        handleEatInvincibleStar()
      }

      if (speedPowerups.includes(newHead)) {
        eatSpeedPowerup(newHead)
        triggerBoost() 
      }
    }
    const intervalId = setInterval(gameTick, isBoosted ? 80 : 150)
  return () => clearInterval(intervalId)

  // 在依賴陣列中加入 isBoosted，狀態一變，就會立刻切換速度
  }, [gameStatus, wallEnabled, score, food, spawnSpeedPowerup, isBoosted, handleEatInvincibleStar, invincibleStar, speedPowerups])

  return {
    snake,
    snakeSet, 
    food,
    score,
    highScore,
    gameStatus,
    direction,
    startGame,
    togglePause,
    setDirection: handleSetDirection,
    bgmVolume,
    setBgmVolume,
    wallEnabled,
    speedPowerups,
    wallRef,
    invincibleStar,
    isInvincible,
    toggleMute,
    isMuted,
    starRemaining,
  }
}

