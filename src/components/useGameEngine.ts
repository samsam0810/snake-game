import { useCallback, useEffect, useRef, useState } from 'react'
import { useGameAudio } from './useGameAudio'
import { usePowerups } from './usePowerups'
import { useGameScore } from './useGameScore'
import { useDirection } from './useDirection'
import { useBoost } from './useBoost'
import { useFood, getRandomFood } from './useFood'
import { useSnake, INITIAL_SNAKE } from './useSnake'

export type GameStatus = 'idle' | 'playing' | 'paused' | 'gameOver'

export function useGameEngine() {
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

  const { 
    snake, 
    snakeRef, 
    snakeSet, 
    resetSnake, 
    getNextHeadPosition, 
    moveSnakeBody 
  } = useSnake()

  const foodRef = useRef<number>(getRandomFood(new Set(INITIAL_SNAKE), false))
  const [food, setFood] = useState<number>(foodRef.current)

  const [wallEnabled, setWallEnabled] = useState(false)

  const { wallRef: foodWallRef, resetWallConfig, calculateNextWallStatus } = useFood()


  const { score, highScore, updateScore, resetScore } = useGameScore()

  const [gameStatus, setGameStatus] = useState<GameStatus>('idle')

  const { 
    direction, 
    handleSetDirection, 
    getNextDirection, 
    resetDirection 
  } = useDirection()


  const {
    speedPowerups,
    spawnSpeedPowerup,
    eatSpeedPowerup, 
    invincibleStar,
    isInvincible,
    isInvincibleRef,
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
    const initialSet = resetSnake()

    resetDirection()
    resetWallConfig()

    setFood(getRandomFood(initialSet, false))
    setWallEnabled(false)
    resetScore() 
    setGameStatus('playing')

    resetBoost()

     // 重置道具並啟動無敵星星倒數
    resetPowerups() 
  }, [resetSnake, resetPowerups, resetDirection, resetWallConfig, resetScore, resetBoost])



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
            // 1. 取得蛇頭的下一步，並檢查有沒有撞牆
      const head = snakeRef.current[0]
      const { newHead, hitWall } = getNextHeadPosition(head, actualDir, wallEnabled, isInvincibleRef.current)

      if (hitWall) {
        setGameStatus('gameOver')
        return
      }

      // 2. 判斷這一步會不會吃到食物
      const willEat = newHead === food

      // 3. 移動蛇的身體，並檢查有沒有咬到自己
      const { newSnake, hitSelf } = moveSnakeBody(newHead, willEat, isInvincibleRef.current)

      if (hitSelf) {
        setGameStatus('gameOver')
        return
      }

        // === 吃到食物 ===
      if (willEat) {
        setGameEvent('eat')
        const { nextScore, nextWallActive } = calculateNextWallStatus(score, wallEnabled)
        updateScore(nextScore)
        setWallEnabled(nextWallActive)
    
        const newFoodPos = getRandomFood(new Set(newSnake), nextWallActive)
        setFood(newFoodPos)
        foodRef.current = newFoodPos // 同步 ref

        if (nextScore % 5 === 0) {
          spawnSpeedPowerup()
        }
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
  }, [gameStatus, wallEnabled, score, food, spawnSpeedPowerup, isBoosted, handleEatInvincibleStar, invincibleStar, speedPowerups, calculateNextWallStatus, updateScore, getNextDirection, eatSpeedPowerup, triggerBoost, getNextHeadPosition, moveSnakeBody])

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
    wallRef: foodWallRef,
    invincibleStar,
    isInvincible,
    toggleMute,
    isMuted,
    starRemaining,
    isBoosted,
  }
}

