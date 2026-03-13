import { useCallback, useEffect, useRef, useState } from 'react'

const BOARD_SIZE = 400 // 20x20 網格，若你的 GRID_SIZE 改了，要同步

export function usePowerups(snakeSet: Set<number>, food: number) {
  //用 ref 同步最新的蛇與食物位置，解決 setInterval/setTimeout 吃到舊資料的問題
  const snakeSetRef = useRef(snakeSet)
  const foodRef = useRef(food)

  useEffect(() => {
    snakeSetRef.current = snakeSet
    foodRef.current = food
  }, [snakeSet, food])

  // 所有 State 與 Ref
  // ======== 加速道具 ========
  const [speedPowerups, setSpeedPowerups] = useState<number[]>([])
  const speedPowerupRef = useRef<number[]>([])
  const speedPowerupTimeoutRef = useRef<{
    [pos: number]: { timeoutId: number; start: number; remaining: number }
  }>({})
  // ======== 無敵星星 ========
  const [invincibleStar, setInvincibleStar] = useState<number | null>(null)
  const invincibleStarRef = useRef<number | null>(null)
  const [isInvincible, setIsInvincible] = useState(false)
  const isInvincibleRef = useRef(false)

  const [starRemaining, setStarRemaining] = useState<number | null>(null)
  const starIntervalRef = useRef<number | null>(null)
  const starStartRef = useRef<number>(0)
  const starDurationRef = useRef<number>(10000)
  const starDisappearTimeoutRef = useRef<number | null>(null)
  const invincibleTimeoutRef = useRef<number | null>(null)

  // 用來記錄「等待下一顆星星生成」的暫停時間
  const nextSpawnTimeoutRef = useRef<number | null>(null)
  const nextSpawnStartRef = useRef<number>(0)
  const nextSpawnDelayRef = useRef<number>(0)


  const SPAWN_DURATION = 10000 // 10 秒

  // 無敵星星邏輯
  const spawnInvincibleStar = useCallback(() => {
    // 生成計時器已經觸發完畢，必須清空 ref
    nextSpawnTimeoutRef.current = null

    let pos: number
    do {
      pos = Math.floor(Math.random() * BOARD_SIZE)
    } while (
      snakeSetRef.current.has(pos)  ||
      pos === foodRef.current ||
      speedPowerupRef.current.includes(pos)
    )

    setInvincibleStar(pos)
    invincibleStarRef.current = pos

    starDurationRef.current = 10000
    starStartRef.current = Date.now()
    setStarRemaining(10)

    if (starIntervalRef.current !== null) clearInterval(starIntervalRef.current)
    starIntervalRef.current = window.setInterval(() => {
      const elapsed = Date.now() - starStartRef.current
      const remaining = Math.ceil((starDurationRef.current - elapsed) / 1000)
      setStarRemaining(remaining > 0 ? remaining : 0)
    }, 200)

    // 10 秒後消失
    starDisappearTimeoutRef.current = window.setTimeout(() => {
      starDisappearTimeoutRef.current = null // 觸發後清空 ref
      setInvincibleStar(null)
      invincibleStarRef.current = null
      setStarRemaining(null)
      scheduleNextStarSpawn()
    }, 10000)
  }, [])

  const scheduleNextStarSpawn = useCallback(() => {
    const delay = 10000 + Math.random() * 20000

    // 記錄生成的倒數時間，以便暫停使用
    nextSpawnDelayRef.current = delay
    nextSpawnStartRef.current = Date.now()

    if (nextSpawnTimeoutRef.current) {
      clearTimeout(nextSpawnTimeoutRef.current)
      nextSpawnTimeoutRef.current = null // 清除後必須為 null
    }
    nextSpawnTimeoutRef.current = window.setTimeout(() => {
      nextSpawnTimeoutRef.current = null
      spawnInvincibleStar()
    }, delay)
  },[spawnInvincibleStar])

  const handleEatInvincibleStar = useCallback(() => {
    if (invincibleTimeoutRef.current) {
      clearTimeout(invincibleTimeoutRef.current)
      invincibleTimeoutRef.current = null
    }
    if (starIntervalRef.current !== null) {
      clearInterval(starIntervalRef.current)
      starIntervalRef.current = null
    }
    if (starDisappearTimeoutRef.current){
      clearTimeout(starDisappearTimeoutRef.current)
      starDisappearTimeoutRef.current = null
    } 

    setInvincibleStar(null)
    invincibleStarRef.current = null

    setIsInvincible(true)
    isInvincibleRef.current = true

    starDurationRef.current = 10000
    starStartRef.current = Date.now()
    setStarRemaining(10)

    invincibleTimeoutRef.current = window.setTimeout(() => {
      invincibleTimeoutRef.current = null
      setIsInvincible(false)
      isInvincibleRef.current = false
      setStarRemaining(null)
      scheduleNextStarSpawn()
    }, 10000)

    starIntervalRef.current = window.setInterval(() => {
      const elapsed = Date.now() - starStartRef.current
      const remaining = Math.ceil((starDurationRef.current - elapsed) / 1000)
      setStarRemaining(remaining > 0 ? remaining : 0)
    }, 200)
  }, [scheduleNextStarSpawn])


  const pauseInvincible = useCallback(() => {
    if (starIntervalRef.current !== null) {
      clearInterval(starIntervalRef.current)
      starIntervalRef.current = null
    }

    if (starDisappearTimeoutRef.current) {
      const elapsed = Date.now() - starStartRef.current
      starDurationRef.current -= elapsed
      clearTimeout(starDisappearTimeoutRef.current)
      starDisappearTimeoutRef.current = null
    }

    if (invincibleTimeoutRef.current) {
      const elapsed = Date.now() - starStartRef.current
      starDurationRef.current -= elapsed
      clearTimeout(invincibleTimeoutRef.current)
      invincibleTimeoutRef.current = null
    }

    if (nextSpawnTimeoutRef.current) {
      const elapsed = Date.now() - nextSpawnStartRef.current
      nextSpawnDelayRef.current -= elapsed
      clearTimeout(nextSpawnTimeoutRef.current)
      nextSpawnTimeoutRef.current = null
    }
  }, [])

  const resumeInvincible = useCallback(() => {
     const hasActiveStar = invincibleStarRef.current !== null || isInvincibleRef.current;
    // 情況 A：星星在地上 或 處於無敵狀態
    if (hasActiveStar && starDurationRef.current > 0) {
      starStartRef.current = Date.now()

      // 重新啟動 UI 數字 Interval
      if (starIntervalRef.current !== null) clearInterval(starIntervalRef.current)
      starIntervalRef.current = window.setInterval(() => {
        const elapsed = Date.now() - starStartRef.current
        const remaining = Math.ceil((starDurationRef.current - elapsed) / 1000)
        setStarRemaining(remaining > 0 ? remaining : 0)
      }, 200)

      if (isInvincibleRef.current) {
        if (invincibleTimeoutRef.current) clearTimeout(invincibleTimeoutRef.current)
        // 恢復無敵倒數
        invincibleTimeoutRef.current = window.setTimeout(() => {
          invincibleTimeoutRef.current = null
          setIsInvincible(false)
          isInvincibleRef.current = false
          setStarRemaining(null)
          scheduleNextStarSpawn()
        }, starDurationRef.current)
      } else if (invincibleStarRef.current !== null) {
        if (starDisappearTimeoutRef.current) clearTimeout(starDisappearTimeoutRef.current)
        // 恢復星星消失倒數
        starDisappearTimeoutRef.current = window.setTimeout(() => {
          starDisappearTimeoutRef.current = null
          setInvincibleStar(null)
          invincibleStarRef.current = null
          setStarRemaining(null)
          scheduleNextStarSpawn()
        }, starDurationRef.current)
      }
    } 
    // 情況 B：正在等待下一顆星星生成
    else if (nextSpawnDelayRef.current > 0) {
      nextSpawnStartRef.current = Date.now()
      if (nextSpawnTimeoutRef.current) {
        clearTimeout(nextSpawnTimeoutRef.current)
        nextSpawnTimeoutRef.current = null
      }
      nextSpawnTimeoutRef.current = window.setTimeout(() => {
        nextSpawnTimeoutRef.current = null
        spawnInvincibleStar()
      }, nextSpawnDelayRef.current)
    }
  }, [scheduleNextStarSpawn, spawnInvincibleStar])


  //加速道具邏輯
  const spawnSpeedPowerup = useCallback(() => {
    let pos: number
    do {
      pos = Math.floor(Math.random() * BOARD_SIZE)
    } while (
      snakeSetRef.current.has(pos) ||
      speedPowerupRef.current.includes(pos) ||
      pos === invincibleStarRef.current
    )

    speedPowerupRef.current.push(pos)
    setSpeedPowerups([...speedPowerupRef.current])

    const start = Date.now()
    const timeoutId = window.setTimeout(() => {
      const index = speedPowerupRef.current.indexOf(pos)
      if (index !== -1) {
        speedPowerupRef.current.splice(index, 1)
        setSpeedPowerups([...speedPowerupRef.current])
      }
      delete speedPowerupTimeoutRef.current[pos]
    }, SPAWN_DURATION)

    speedPowerupTimeoutRef.current[pos] = { timeoutId, start, remaining: SPAWN_DURATION }
  }, [])

  const eatSpeedPowerup = useCallback((pos: number) => {
    const index = speedPowerupRef.current.indexOf(pos)
    if (index === -1) return
    speedPowerupRef.current.splice(index, 1)
    setSpeedPowerups([...speedPowerupRef.current])
    const timer = speedPowerupTimeoutRef.current[pos]
    if (timer) {
      clearTimeout(timer.timeoutId)
      delete speedPowerupTimeoutRef.current[pos]
    }
  }, [])

  //暫停與恢復
  const pausePowerups = useCallback(() => {
    pauseInvincible()
    Object.values(speedPowerupTimeoutRef.current).forEach(item => {
      clearTimeout(item.timeoutId)
      const elapsed = Date.now() - item.start
      item.remaining -= elapsed
    })
  }, [pauseInvincible])

  const resumePowerups = useCallback(() => {
    resumeInvincible()
    Object.entries(speedPowerupTimeoutRef.current).forEach(([pos, item]) => {
        item.start = Date.now()
        item.timeoutId = window.setTimeout(() => {
          const index = speedPowerupRef.current.indexOf(Number(pos))
          if (index !== -1) {
            speedPowerupRef.current.splice(index, 1)
            setSpeedPowerups([...speedPowerupRef.current])
          }
          delete speedPowerupTimeoutRef.current[Number(pos)]
        }, item.remaining)
      })
    }, [resumeInvincible])

    // 重置所有道具狀態，並啟動第一顆星星的計時器
  const resetPowerups = useCallback(() => {
    // 1. 清除所有現存的計時器
    if (starIntervalRef.current !== null) clearInterval(starIntervalRef.current)
    if (starDisappearTimeoutRef.current) clearTimeout(starDisappearTimeoutRef.current)
    if (invincibleTimeoutRef.current) clearTimeout(invincibleTimeoutRef.current)
    if (nextSpawnTimeoutRef.current) clearTimeout(nextSpawnTimeoutRef.current)
    Object.values(speedPowerupTimeoutRef.current).forEach(item => {
      clearTimeout(item.timeoutId)
    })

    // 2. 清空畫面上的道具與狀態
    setSpeedPowerups([])
    speedPowerupRef.current = []
    speedPowerupTimeoutRef.current = {}

    setInvincibleStar(null)
    invincibleStarRef.current = null
    setIsInvincible(false)
    isInvincibleRef.current = false
    setStarRemaining(null)

    // 3. 最重要的一步：啟動第一顆無敵星星的生成倒數！
    scheduleNextStarSpawn()
  }, [scheduleNextStarSpawn])
    
  useEffect(() => {
    return () => {
      if (starIntervalRef.current !== null) clearInterval(starIntervalRef.current)
      if (starDisappearTimeoutRef.current) clearTimeout(starDisappearTimeoutRef.current)
      if (invincibleTimeoutRef.current) clearTimeout(invincibleTimeoutRef.current)
      if (nextSpawnTimeoutRef.current) clearTimeout(nextSpawnTimeoutRef.current)
      Object.values(speedPowerupTimeoutRef.current).forEach(item =>
        clearTimeout(item.timeoutId)
      )
    }
  }, [])

  return {
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
    resetPowerups,
  }
}