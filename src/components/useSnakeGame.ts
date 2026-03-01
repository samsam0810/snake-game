import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const GRID_SIZE = 20
const BOARD_SIZE = GRID_SIZE * GRID_SIZE

export type Direction = 'up' | 'down' | 'left' | 'right'
export type GameStatus = 'idle' | 'playing' | 'paused' | 'gameOver'



const oppositeDirection: Record<Direction, Direction> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
}

const INITIAL_SNAKE: number[] = [42, 41, 40]
const INITIAL_DIRECTION: Direction = 'right'


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
  const bgmRef = useRef<HTMLAudioElement | null>(null)
  const eatSoundRef = useRef<HTMLAudioElement | null>(null)
  const gameOverSoundRef = useRef<HTMLAudioElement | null>(null)

  const [isMuted, setIsMuted] = useState(false)
  const isMutedRef = useRef(false) // 用 ref 保持最新值給 closure 用

  const [snake, setSnake] = useState<number[]>(INITIAL_SNAKE)
  const snakeRef = useRef<number[]>(INITIAL_SNAKE)
  const [snakeSet, setSnakeSet] = useState<Set<number>>(new Set(INITIAL_SNAKE))

  const [speedPowerups, setSpeedPowerups] = useState<number[]>([])
  const speedPowerupRef = useRef<number[]>([])


  const foodRef = useRef<number>(getRandomFood(new Set(INITIAL_SNAKE), false))
  const [food, setFood] = useState<number>(foodRef.current)

  const [score, setScore] = useState<number>(0)
  const [gameStatus, setGameStatus] = useState<GameStatus>('idle')

  // 用 ref 保存最新方向，避免 closure bug
  const directionRef = useRef<Direction>(INITIAL_DIRECTION)
  const [direction, setDirectionState] = useState<Direction>(INITIAL_DIRECTION)
  const directionQueue = useRef<Direction[]>([INITIAL_DIRECTION])

  // === 新增：牆模式 state & ref ===
  const [wallEnabled, setWallEnabled] = useState(false)
  const wallRef = useRef({ nextScore: 10, interval: 15 }) // 初始牆出現分數 10，間隔 15

  // 無敵星星
  const [invincibleStar, setInvincibleStar] = useState<number | null>(null)
  const invincibleStarRef = useRef<number | null>(null)

  const [isInvincible, setIsInvincible] = useState(false)
  const isInvincibleRef = useRef(false)

  const starDisappearTimeoutRef = useRef<number | null>(null)
  const invincibleTimeoutRef = useRef<number | null>(null)
  const nextSpawnTimeoutRef = useRef<number | null>(null)

  // 星星倒數秒數給玩家提示
  const [starRemaining, setStarRemaining] = useState<number | null>(null)
  const starIntervalRef = useRef<number | null>(null) // 用來每 200ms 更新倒數
  const starStartRef = useRef<number>(0) // 記錄星星開始生成或吃到的時間
  const starDurationRef = useRef<number>(10000) // 星星或無敵持續時間

  // 道具存在時間
  const speedPowerupTimeoutRef = useRef<{
    [pos: number]: {
      timeoutId: number
      start: number
      remaining: number
    }
  }>({})

  // === 新增：BGM 音量控制 ===
  const [bgmVolume, setBgmVolume] = useState(0.3) // 預設 30%

  // 調整音量
    useEffect(() => {
    const volume = isMutedRef.current ? 0 : bgmVolume
    if (!bgmRef.current) {
      bgmRef.current = new Audio('/audio/kazeem_faheem-game_bg_music_loop-472208.mp3')
      bgmRef.current.loop = true
    }
    bgmRef.current.volume = volume

    if (!eatSoundRef.current) {
      eatSoundRef.current = new Audio('/audio/freesound_community-eating-sound-effect-36186.mp3')
      eatSoundRef.current.volume = volume
    }
    if (!gameOverSoundRef.current) {
      gameOverSoundRef.current = new Audio('/audio/freesound_community-game-over-arcade-6435.mp3')
      gameOverSoundRef.current.volume = volume
    }
  }, [])

    // Slider 調整音量
    useEffect(() => {
      const volume = isMutedRef.current ? 0 : bgmVolume
      if (bgmRef.current) bgmRef.current.volume = volume
      if (eatSoundRef.current) eatSoundRef.current.volume = volume
      if (gameOverSoundRef.current) gameOverSoundRef.current.volume = volume
    }, [bgmVolume])

    const toggleMute = useCallback(() => {
      setIsMuted(prev => {
        const newMuted = !prev
        isMutedRef.current = newMuted

        const volume = newMuted ? 0 : bgmVolume
        // 立即套用到所有音效
        if (bgmRef.current) bgmRef.current.volume = volume
        if (eatSoundRef.current) eatSoundRef.current.volume = volume
        if (gameOverSoundRef.current) gameOverSoundRef.current.volume = volume

        return newMuted
      })
    }, [bgmVolume])

  // 根據分數調整速度：初始 300ms，每 +5 分加快 50ms，最快 100ms
  const speed = useMemo(
    () => Math.max(100, 300 - Math.floor(score / 5) * 50),
    [score],
  )

  const [isBoosted, setIsBoosted] = useState(false)

  const BOOST_DURATION = 3000

  const boostTimeoutRef = useRef<number | null>(null)
  const boostStartRef = useRef<number>(0)
  const boostRemainingRef = useRef<number>(BOOST_DURATION)

  const SPAWN_DURATION = 10000 // 10 秒
  const spawnSpeedPowerup = useCallback((occupied: Set<number>) => {
    // 1. 生成一個不在蛇身的隨機格子
    let pos: number
    do {
      pos = Math.floor(Math.random() * BOARD_SIZE)
    } while (occupied.has(pos))
    
    // 2. 加入 ref 與 state
    speedPowerupRef.current.push(pos)
    setSpeedPowerups([...speedPowerupRef.current])

    // 3. 設定定時器，SPAWN_DURATION 後自動消失
    const start = Date.now()
      const timeoutId = window.setTimeout(() => {
      const index = speedPowerupRef.current.indexOf(pos)
      if (index !== -1) {
        speedPowerupRef.current.splice(index, 1)
        setSpeedPowerups([...speedPowerupRef.current])
      }
      // 清掉記錄
      delete speedPowerupTimeoutRef.current[pos]

    }, SPAWN_DURATION)

    speedPowerupTimeoutRef.current[pos] = {
      timeoutId,
      start,
      remaining: SPAWN_DURATION
    }
  }, [])

  const spawnInvincibleStar = useCallback(() => {
  // 隨機生成位置
    let pos: number
    do {
      pos = Math.floor(Math.random() * BOARD_SIZE)
    } while (snakeSet.has(pos) || pos === food || speedPowerupRef.current.includes(pos))
    
    setInvincibleStar(pos)
    invincibleStarRef.current = pos

    // 設定倒數
    starDurationRef.current = 10000
    starStartRef.current = Date.now()
    setStarRemaining(10) // 秒數
    if (starIntervalRef.current) clearInterval(starIntervalRef.current)
    starIntervalRef.current = window.setInterval(() => {
      const elapsed = Date.now() - starStartRef.current
      const remaining = Math.ceil((starDurationRef.current - elapsed) / 1000)
      setStarRemaining(remaining > 0 ? remaining : 0)
    }, 200)

    // 10秒後消失
    starDisappearTimeoutRef.current = window.setTimeout(() => {
      // 自然消失
      setInvincibleStar(null)
      invincibleStarRef.current = null

      // 從「消失」開始算 10~30秒後生成下一顆
      scheduleNextStarSpawn()
    }, 10000)
  }, [snakeSet, food])

  const scheduleNextStarSpawn = useCallback(() => {
    const delay = 10000 + Math.random() * 20000

    nextSpawnTimeoutRef.current = window.setTimeout(() => {
      spawnInvincibleStar()
    }, delay)

  }, [spawnInvincibleStar])

  const handleEatInvincibleStar = useCallback(() => {
    // 取消自然消失 timer
    if (starDisappearTimeoutRef.current) {
      clearTimeout(starDisappearTimeoutRef.current)
      starDisappearTimeoutRef.current = null
    }

    // 清掉星星
    setInvincibleStar(null)
    invincibleStarRef.current = null

    // 進入無敵
    setIsInvincible(true)
    isInvincibleRef.current = true

    starDurationRef.current = 10000
    starStartRef.current = Date.now()
    setStarRemaining(10)
    if (starIntervalRef.current) clearInterval(starIntervalRef.current)
    starIntervalRef.current = window.setInterval(() => {
      const elapsed = Date.now() - starStartRef.current
      const remaining = Math.ceil((starDurationRef.current - elapsed) / 1000)
      setStarRemaining(remaining > 0 ? remaining : 0)
    }, 200)

    // 設定無敵 10 秒
    invincibleTimeoutRef.current = window.setTimeout(() => {
      setIsInvincible(false)
      isInvincibleRef.current = false

      // ⭐ 無敵結束才開始算 10~30 秒
      scheduleNextStarSpawn()

    }, 10000)

  }, [scheduleNextStarSpawn])

  const pausePowerupTimers = () => {
    // 加速道具暫停
    Object.values(speedPowerupTimeoutRef.current).forEach(item => {
      clearTimeout(item.timeoutId)
      const elapsed = Date.now() - item.start
      item.remaining -= elapsed
    })
    // 無敵星星暫停
    if (starIntervalRef.current) clearInterval(starIntervalRef.current)
    if (invincibleTimeoutRef.current) {
      const elapsed = Date.now() - starStartRef.current
      starDurationRef.current -= elapsed
      clearTimeout(invincibleTimeoutRef.current)
      invincibleTimeoutRef.current = null
  }
  }

  //新增「恢復倒數」函式
  const resumePowerupTimers = () => {
    // 加速道具恢復
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
    // 無敵星星倒數恢復
    if (starRemaining !== null) {
      starStartRef.current = Date.now()
      if (isInvincibleRef.current) {
        invincibleTimeoutRef.current = window.setTimeout(() => {
          setIsInvincible(false)
          isInvincibleRef.current = false
          setStarRemaining(null)
          if (starIntervalRef.current) {
            clearInterval(starIntervalRef.current)
            starIntervalRef.current = null
          }
          scheduleNextStarSpawn()
        }, starDurationRef.current)

        starIntervalRef.current = window.setInterval(() => {
          const elapsed = Date.now() - starStartRef.current
          const remaining = Math.ceil((starDurationRef.current - elapsed) / 1000)
          setStarRemaining(remaining > 0 ? remaining : 0)
        }, 200)
      } else {
        // 星星存在但沒吃
        starIntervalRef.current = window.setInterval(() => {
          const elapsed = Date.now() - starStartRef.current
          const remaining = Math.ceil((starDurationRef.current - elapsed) / 1000)
          setStarRemaining(remaining > 0 ? remaining : 0)
        }, 200)
      }
    }
  }

  const startGame = useCallback(() => {
    const initialSet = new Set(INITIAL_SNAKE)
    snakeRef.current = INITIAL_SNAKE // 同步更新 ref
    setSnake(INITIAL_SNAKE)
    setSnakeSet(initialSet)

    directionRef.current = INITIAL_DIRECTION
    setDirectionState(INITIAL_DIRECTION)
    directionQueue.current = [INITIAL_DIRECTION]

    setFood(getRandomFood(initialSet, wallEnabled))
    setScore(0)
    setGameStatus('playing')
    setWallEnabled(false)
    wallRef.current = { nextScore: 10, interval: 15 }

    speedPowerupRef.current = []
    setSpeedPowerups([])

    setIsBoosted(false) // <--- 新增這行，確保重新開始時不會自帶加速

    // 播放 BGM
    if (bgmRef.current) {
      bgmRef.current.currentTime = 0
      if (!isMutedRef.current) bgmRef.current.play()
    }

    // 清除舊的星星 timer
    if (nextSpawnTimeoutRef.current) {
      clearTimeout(nextSpawnTimeoutRef.current)
    }
    if (starDisappearTimeoutRef.current) {
      clearTimeout(starDisappearTimeoutRef.current)
    }
    if (invincibleTimeoutRef.current) {
      clearTimeout(invincibleTimeoutRef.current)
    }

    // 重置狀態
    setInvincibleStar(null)
    invincibleStarRef.current = null
    setIsInvincible(false)
    isInvincibleRef.current = false

    // 1~10 秒後生成第一顆
    const firstDelay = 1000 + Math.random() * 9000
    nextSpawnTimeoutRef.current = window.setTimeout(() => {
      spawnInvincibleStar()
    }, firstDelay)

  }, [spawnInvincibleStar, bgmVolume])



  // 暫停時：
    const togglePause = useCallback(() => {
      setGameStatus((prev) => {
        if (prev === 'playing') {
          pausePowerupTimers()
          if (boostTimeoutRef.current) {
            clearTimeout(boostTimeoutRef.current)

            const elapsed = Date.now() - boostStartRef.current
            boostRemainingRef.current -= elapsed
          }
          bgmRef.current?.pause()
          return 'paused'
        }
        if (prev === 'paused'){
          resumePowerupTimers()
          if (boostRemainingRef.current > 0) {
            boostStartRef.current = Date.now()

            boostTimeoutRef.current = window.setTimeout(() => {
              setIsBoosted(false)
              boostTimeoutRef.current = null
            }, boostRemainingRef.current)
          }
          bgmRef.current?.play()
          return 'playing'
        }
        return prev
      })
    }, [])


  const setDirection = useCallback((dir: Direction) => {
    const currentDir = directionRef.current
    const lastDir = directionQueue.current.length > 0
      ? directionQueue.current[directionQueue.current.length - 1]
      : currentDir


    if (dir === lastDir || dir === oppositeDirection[lastDir]) return
    
    directionQueue.current.push(dir)
  }, [])

  // 自動移動與吃食物與死亡判定
  useEffect(() => {
    if (gameStatus !== 'playing') {
      return
    }

    const gameTick = () => {
      // 取得方向
      const nextDir = directionQueue.current.length > 0
        ? directionQueue.current.shift()!
        : directionRef.current

      // 出隊時檢查反方向，避免立刻撞自己
      const actualDir = nextDir === oppositeDirection[directionRef.current] ? directionRef.current : nextDir
      directionRef.current = actualDir
      setDirectionState(actualDir)

      const prevSnake = snakeRef.current
      const head = prevSnake[0]
      let newHead = head
        
      // === 判斷牆撞擊 ===
      const isAtWall = 
        (actualDir === 'right' && head % GRID_SIZE === GRID_SIZE - 1) ||
        (actualDir === 'left' && head % GRID_SIZE === 0) ||
        (actualDir === 'up' && head < GRID_SIZE) ||
        (actualDir === 'down' && head >= GRID_SIZE * (GRID_SIZE - 1))

      if (wallEnabled && isAtWall && !isInvincibleRef.current) {
        setGameStatus('gameOver')
        bgmRef.current?.pause()
        bgmRef.current!.currentTime = 0
        eatSoundRef.current?.play() // 撞牆音效先用吃音效代替
        return
      }

      switch (actualDir) {
        case 'right': {
          const atRightEdge = head % GRID_SIZE === GRID_SIZE - 1
          if (wallEnabled && atRightEdge && !isInvincibleRef.current) {
            setGameStatus('gameOver')
            bgmRef.current?.pause()
            bgmRef.current!.currentTime = 0
            gameOverSoundRef.current?.play()
            return
          }
          //正常移動
          newHead = atRightEdge ? head - (GRID_SIZE - 1) : head + 1
          break
        }
        case 'left': {
          const atLeftEdge = head % GRID_SIZE === 0
          if (wallEnabled && atLeftEdge && !isInvincibleRef.current) {
            setGameStatus('gameOver')
            bgmRef.current?.pause()
            bgmRef.current!.currentTime = 0
            gameOverSoundRef.current?.play()
            return
          }
          newHead = atLeftEdge ? head + (GRID_SIZE - 1) : head - 1
          break
        }
        case 'up': {
          const atTopEdge = head < GRID_SIZE
          if (wallEnabled && atTopEdge && !isInvincibleRef.current) {
          setGameStatus('gameOver')
          bgmRef.current?.pause()
          bgmRef.current!.currentTime = 0
          gameOverSoundRef.current?.play()
          return
          }
           newHead = atTopEdge ? head + GRID_SIZE * (GRID_SIZE - 1) : head - GRID_SIZE
          break
        }
        case 'down': {
          const atBottomEdge = head >= GRID_SIZE * (GRID_SIZE - 1)
          if (wallEnabled && atBottomEdge && !isInvincibleRef.current) {
            setGameStatus('gameOver')
            bgmRef.current?.pause()
            bgmRef.current!.currentTime = 0
            gameOverSoundRef.current?.play()
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
        if (snakeBody.has(newHead) && !isInvincibleRef.current) {
          setGameStatus('gameOver')
          bgmRef.current?.pause()
          bgmRef.current!.currentTime = 0
          gameOverSoundRef.current!.currentTime = 0
          gameOverSoundRef.current!.play()
          return
        }
      
        // 更新 snakeRef，給下一次 interval 用
        snakeRef.current = newSnake
        // 同步更新所有 state 給畫面渲染
        setSnake(newSnake)
        setSnakeSet(new Set(newSnake))

        // === 吃到無敵星星 ===
        if (newHead === invincibleStarRef.current) {
          handleEatInvincibleStar()
        }

        // === 吃到食物 ===
      if (willEat) {
        const nextScore = score + 1
        setScore(nextScore)

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
          spawnSpeedPowerup(new Set(newSnake))
        }

        eatSoundRef.current!.currentTime = 0
        eatSoundRef.current!.play()
        setFood(getRandomFood(new Set(newSnake), currentWallActive))
      }

      // === 吃到加速道具 (解決問題 1) ===
      const powerupIndex = speedPowerupRef.current.indexOf(newHead)
      if (powerupIndex !== -1 && !isBoosted) {
        speedPowerupRef.current.splice(powerupIndex, 1)
        setSpeedPowerups([...speedPowerupRef.current])

        setIsBoosted(true) // 這裡更新 State，會強制 useEffect 重新執行並套用新速度！

        // 3秒後解除加速
        // setTimeout(() => { setIsBoosted(false) }, 3000)
        // 如果之前有 timeout，先清掉
        if (boostTimeoutRef.current) {
          clearTimeout(boostTimeoutRef.current)
        }

        boostStartRef.current = Date.now()
        boostRemainingRef.current = BOOST_DURATION

        boostTimeoutRef.current = window.setTimeout(() => {
          setIsBoosted(false)
          boostTimeoutRef.current = null
        }, BOOST_DURATION)
      }
    }

        // 解決問題 1：當 isBoosted 為 true 時，速度變兩倍
    const currentSpeed = isBoosted ? speed/2 : speed;
    const intervalId = setInterval(gameTick, currentSpeed)
    
    return () => clearInterval(intervalId)

  // 記得這裡要在依賴陣列中加入 isBoosted！這樣狀態一變，就會立刻切換速度
  }, [gameStatus, speed, wallEnabled, score, food, spawnSpeedPowerup, isBoosted, handleEatInvincibleStar])

  return {
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
    starRemaining,
  }
}

