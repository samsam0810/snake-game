import { useCallback, useEffect, useState } from 'react'

export function useGameScore() {
  const [score, setScore] = useState<number>(0)
  const [highScore, setHighScore] = useState<number>(0)

  // 1. 元件初次載入時，從 localStorage 讀取最高分
  useEffect(() => {
    const savedHighScore = localStorage.getItem('snake_high_score')
    if (savedHighScore) {
      setHighScore(parseInt(savedHighScore, 10))
    }
  }, [])

  // 2. 更新分數（會自動檢查並記錄最高分）
  const updateScore = useCallback((newScore: number) => {
    setScore(newScore)
    
    setHighScore((prevHigh) => {
      if (newScore > prevHigh) {
        localStorage.setItem('snake_high_score', newScore.toString())
        return newScore
      }
      return prevHigh
    })
  }, [])

  // 3. 遊戲重新開始時重置目前分數
  const resetScore = useCallback(() => {
    setScore(0)
  }, [])

  return {
    score,
    highScore, // 輸出最高分給畫面使用
    updateScore,
    resetScore,
  }
}
