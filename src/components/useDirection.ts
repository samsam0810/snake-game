import { useCallback, useRef, useState } from 'react'

export type Direction = 'up' | 'down' | 'left' | 'right'

const oppositeDirection: Record<Direction, Direction> = {
  up: 'down',
  down: 'up', 
  left: 'right',
  right: 'left',
}

const INITIAL_DIRECTION: Direction = 'right'

export function useDirection() {
  // 給畫面渲染用的 state
  const [direction, setDirectionState] = useState<Direction>(INITIAL_DIRECTION)
  
  // 給定時器即時讀取的 ref
  const directionRef = useRef<Direction>(INITIAL_DIRECTION)
  
  // 防止玩家手速太快，連按兩下導致反向自殺的佇列 (Queue)
  const directionQueue = useRef<Direction[]>([INITIAL_DIRECTION])

  // 重置方向 (遊戲重新開始時呼叫)
  const resetDirection = useCallback(() => {
    directionRef.current = INITIAL_DIRECTION
    setDirectionState(INITIAL_DIRECTION)
    directionQueue.current = [INITIAL_DIRECTION]
  }, [])

  // 接收玩家按鍵輸入
  const handleSetDirection = useCallback((dir: Direction) => {
    const currentDir = directionRef.current
    const lastDir = directionQueue.current.length > 0
      ? directionQueue.current[directionQueue.current.length - 1]
      : currentDir

    // 如果跟目前方向一樣，或者是完全反方向(會撞自己)，就忽略不處理
    if (dir === lastDir || dir === oppositeDirection[lastDir]) return
    
    // 把有效的指令排隊
    directionQueue.current.push(dir)
  }, [])

  // 取得下一個真正要走的方向 (蛇移動時呼叫)
  const getNextDirection = useCallback(() => {
    // 取得玩家輸入的下一個方向，如果沒有就保持原本的方向
    const nextDir = directionQueue.current.length > 0
      ? directionQueue.current.shift()!
      : directionRef.current

    // 再次檢查是否為反方向（雙重保險）
    const actualDir = nextDir === oppositeDirection[directionRef.current] 
      ? directionRef.current 
      : nextDir

    // 同步更新給大腦(ref)和畫面(state)
    directionRef.current = actualDir
    setDirectionState(actualDir)

    return actualDir
  }, [])

  return {
    direction,
    handleSetDirection,
    getNextDirection,
    resetDirection
  }
}
