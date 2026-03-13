import { useCallback, useEffect, useRef, useState } from 'react'

const BOOST_DURATION = 3000 // 加速持續時間：3 秒

export function useBoost() {
  // 給畫面或主程式判斷「現在是否處於加速狀態」
  const [isBoosted, setIsBoosted] = useState(false)

  // 用來控制計時器的 Ref
  const boostTimeoutRef = useRef<number | null>(null)
  const boostStartRef = useRef<number>(0)
  const boostRemainingRef = useRef<number>(BOOST_DURATION)

  // 1. 觸發加速（吃到道具時呼叫）
  const triggerBoost = useCallback(() => {
    setIsBoosted(true)

    // 如果本來就在加速，就先清掉舊的計時器（重新計算 3 秒）
    if (boostTimeoutRef.current) {
      clearTimeout(boostTimeoutRef.current)
      boostTimeoutRef.current = null
    }

    // 記錄開始時間與剩餘時間
    boostStartRef.current = Date.now()
    boostRemainingRef.current = BOOST_DURATION

    // 設定 3 秒後結束加速
    boostTimeoutRef.current = window.setTimeout(() => {
      setIsBoosted(false)
      boostTimeoutRef.current = null
    }, BOOST_DURATION)
  }, [])

  // 2. 暫停加速（遊戲暫停時呼叫）
  const pauseBoost = useCallback(() => {
    if (boostTimeoutRef.current) {
      clearTimeout(boostTimeoutRef.current)
      boostTimeoutRef.current = null

      // 計算經過了多少時間，並扣除剩餘時間
      const elapsed = Date.now() - boostStartRef.current
      boostRemainingRef.current -= elapsed
    }
  }, [])

  // 3. 恢復加速（遊戲恢復時呼叫）
  const resumeBoost = useCallback(() => {
    // 只有在真的還有剩餘時間時才恢復
    if (boostRemainingRef.current > 0 && isBoosted) {
      boostStartRef.current = Date.now()

      boostTimeoutRef.current = window.setTimeout(() => {
        setIsBoosted(false)
        boostTimeoutRef.current = null
      }, boostRemainingRef.current)
    }
  }, [isBoosted])

  // 4. 強制重置加速（遊戲重新開始時呼叫）
  const resetBoost = useCallback(() => {
    if (boostTimeoutRef.current) {
      clearTimeout(boostTimeoutRef.current)
      boostTimeoutRef.current = null
    }
    setIsBoosted(false)
    boostRemainingRef.current = BOOST_DURATION
  }, [])

  // 元件卸載時的清理，防止記憶體洩漏
  useEffect(() => {
    return () => {
      if (boostTimeoutRef.current) {
        clearTimeout(boostTimeoutRef.current)
      }
    }
  }, [])

  return {
    isBoosted,
    triggerBoost,
    pauseBoost,
    resumeBoost,
    resetBoost,
  }
}
