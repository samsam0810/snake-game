import { useCallback, useRef, useState } from 'react'
import type { Direction } from './useDirection'

const GRID_SIZE = 20
export const INITIAL_SNAKE: number[] = [42, 41, 40]


export function useSnake() {
  // === 蛇的狀態 ===
  const [snake, setSnake] = useState<number[]>(INITIAL_SNAKE)
  const snakeRef = useRef<number[]>(INITIAL_SNAKE)
  const [snakeSet, setSnakeSet] = useState<Set<number>>(new Set(INITIAL_SNAKE))

  // 1. 重新開始遊戲時：重置蛇的狀態
  const resetSnake = useCallback(() => {
    const initialSet = new Set(INITIAL_SNAKE)
    snakeRef.current = INITIAL_SNAKE
    setSnake(INITIAL_SNAKE)
    setSnakeSet(initialSet)
    return initialSet // 回傳 Set 給主程式去生成第一顆食物
  }, [])

  // 2. 物理計算：計算蛇頭的下一步，以及有沒有撞到牆壁
  const getNextHeadPosition = useCallback((
    head: number, 
    actualDir: Direction, 
    wallEnabled: boolean, 
    isInvincible: boolean
  ) => {
    let newHead = head
    let hitWall = false

    const atRightEdge = head % GRID_SIZE === GRID_SIZE - 1
    const atLeftEdge = head % GRID_SIZE === 0
    const atTopEdge = head < GRID_SIZE
    const atBottomEdge = head >= GRID_SIZE * (GRID_SIZE - 1)

    // 判斷撞牆
    if (wallEnabled && !isInvincible) {
      if ((actualDir === 'right' && atRightEdge) ||
          (actualDir === 'left' && atLeftEdge) ||
          (actualDir === 'up' && atTopEdge) ||
          (actualDir === 'down' && atBottomEdge)) {
        hitWall = true
      }
    }

    // 計算新蛇頭位置 (包含穿牆邏輯)
    switch (actualDir) {
      case 'right': newHead = atRightEdge ? head - (GRID_SIZE - 1) : head + 1; break;
      case 'left': newHead = atLeftEdge ? head + (GRID_SIZE - 1) : head - 1; break;
      case 'up': newHead = atTopEdge ? head + GRID_SIZE * (GRID_SIZE - 1) : head - GRID_SIZE; break;
      case 'down': newHead = atBottomEdge ? head % GRID_SIZE : head + GRID_SIZE; break;
    }

    return { newHead, hitWall }
  }, [])

  // 3. 身體移動：根據有沒有吃到食物，更新整條蛇的陣列，並檢查有沒有咬到自己
  const moveSnakeBody = useCallback((newHead: number, willEat: boolean, isInvincible: boolean) => {
    const prevSnake = snakeRef.current
    
    // 如果吃到食物，就只加頭不切尾巴；沒吃到就加頭切尾巴
    const newSnake = willEat
      ? [newHead, ...prevSnake]
      : [newHead, ...prevSnake.slice(0, -1)]

    // 檢查有沒有咬到自己
    const snakeBody = new Set(newSnake.slice(1))
    const hitSelf = snakeBody.has(newHead) && !isInvincible

    // 如果沒死，才正式更新狀態給畫面
    if (!hitSelf) {
      snakeRef.current = newSnake
      setSnake(newSnake)
      setSnakeSet(new Set(newSnake))
    }

    return { newSnake, hitSelf }
  }, [])

  return {
    snake,
    snakeRef,
    snakeSet,
    resetSnake,
    getNextHeadPosition,
    moveSnakeBody
  }
}
