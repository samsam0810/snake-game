import { useCallback, useRef } from 'react'

const GRID_SIZE = 20
const BOARD_SIZE = GRID_SIZE * GRID_SIZE

function isWallCell(index: number) {
  const row = Math.floor(index / GRID_SIZE)
  const col = index % GRID_SIZE
  return row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE
}

// 暴露出這個函式，讓外部可以直接呼叫
export function getRandomFood(snakeSet: Set<number>, wallEnabled: boolean): number {
  let food: number
  do {
    food = Math.floor(Math.random() * BOARD_SIZE)
  } while (snakeSet.has(food) || (wallEnabled && isWallCell(food)))
  return food
}

export function useFood() {
  const wallRef = useRef({ nextScore: 10, interval: 15 })

  // 重置牆壁計數器
  const resetWallConfig = useCallback(() => {
    wallRef.current = { nextScore: 10, interval: 15 }
  }, [])

  // 純粹計算：根據目前分數，告訴我下一面牆壁要不要開
  const calculateNextWallStatus = useCallback((currentScore: number, currentWallActive: boolean) => {
    const nextScore = currentScore + 1
    let nextWallActive = currentWallActive

    if (!currentWallActive && nextScore === wallRef.current.nextScore) {
      nextWallActive = true
    } else if (currentWallActive && nextScore === wallRef.current.nextScore + 5) {
      nextWallActive = false
      wallRef.current.nextScore += wallRef.current.interval
      wallRef.current.interval += 5
    }

    return { nextScore, nextWallActive }
  }, [])

  return {
    wallRef,
    resetWallConfig,
    calculateNextWallStatus
  }
}
