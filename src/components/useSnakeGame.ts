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

  // === 新增：BGM 音量控制 ===
  const [bgmVolume, setBgmVolume] = useState(0.3) // 預設 30%

  // 調整音量
  useEffect(() => {
    if (bgmRef.current) {
      bgmRef.current.volume = bgmVolume
      if (eatSoundRef.current) eatSoundRef.current.volume = bgmVolume
      if (gameOverSoundRef.current) gameOverSoundRef.current.volume = bgmVolume
    }
  }, [bgmVolume])

  useEffect(() => {
  if (!eatSoundRef.current) {
    eatSoundRef.current = new Audio('/audio/freesound_community-eating-sound-effect-36186.mp3')
  }
  }, [])

  useEffect(() => {
  if (!gameOverSoundRef.current) {
    gameOverSoundRef.current = new Audio('/audio/freesound_community-game-over-arcade-6435.mp3')
  }
  }, [])

  // 根據分數調整速度：初始 300ms，每 +5 分加快 50ms，最快 100ms
  const speed = useMemo(
    () => Math.max(100, 300 - Math.floor(score / 5) * 50),
    [score],
  )
  const [isBoosted, setIsBoosted] = useState(false)

  const spawnSpeedPowerup = useCallback((occupied: Set<number>, wallEnabled: boolean) => {
    let pos: number
    do {
      pos = Math.floor(Math.random() * BOARD_SIZE)
    } while (occupied.has(pos) || (wallEnabled && isWallCell(pos)))

    speedPowerupRef.current.push(pos)
    setSpeedPowerups([...speedPowerupRef.current])
  }, [])

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

    // 音樂初始化
    if (!bgmRef.current) {
      bgmRef.current = new Audio('/audio/kazeem_faheem-game_bg_music_loop-472208.mp3')
      bgmRef.current.volume = bgmVolume
      bgmRef.current.loop = true
    }
    bgmRef.current.currentTime = 0
    bgmRef.current.play()
  }, [])

  const togglePause = useCallback(() => {
    setGameStatus((prev) => {
      if (prev === 'playing') {
        bgmRef.current?.pause()
        return 'paused'
      }
      if (prev === 'paused'){
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

      if (wallEnabled && isAtWall) {
        setGameStatus('gameOver')
        bgmRef.current?.pause()
        bgmRef.current!.currentTime = 0
        eatSoundRef.current?.play() // 撞牆音效先用吃音效代替
        return
      }

      switch (actualDir) {
        case 'right': {
          if (wallEnabled && head % GRID_SIZE === GRID_SIZE - 1) {
            setGameStatus('gameOver')
            bgmRef.current?.pause()
            bgmRef.current!.currentTime = 0
            gameOverSoundRef.current?.play()
            return
          }
          newHead = wallEnabled ? head + 1 : (head % GRID_SIZE === GRID_SIZE - 1 ? head - (GRID_SIZE - 1) : head + 1)
          break
        }
        case 'left': {
          if (wallEnabled && head % GRID_SIZE === 0) {
            setGameStatus('gameOver')
            bgmRef.current?.pause()
            bgmRef.current!.currentTime = 0
            gameOverSoundRef.current?.play()
            return
          }
          newHead = wallEnabled ? head - 1 : (head % GRID_SIZE === 0 ? head + (GRID_SIZE - 1) : head - 1)
          break
        }
        case 'up': {
          if (wallEnabled && head < GRID_SIZE) {
            setGameStatus('gameOver')
            bgmRef.current?.pause()
            bgmRef.current!.currentTime = 0
            gameOverSoundRef.current?.play()
            return
          }
          newHead = wallEnabled ? head - GRID_SIZE : (head < GRID_SIZE ? head + GRID_SIZE * (GRID_SIZE - 1) : head - GRID_SIZE)
          break
        }
        case 'down': {
          if (wallEnabled && head >= GRID_SIZE * (GRID_SIZE - 1)) {
            setGameStatus('gameOver')
            bgmRef.current?.pause()
            bgmRef.current!.currentTime = 0
            gameOverSoundRef.current?.play()
            return
          }
          newHead = wallEnabled ? head + GRID_SIZE : (head >= GRID_SIZE * (GRID_SIZE - 1) ? head % GRID_SIZE : head + GRID_SIZE)
          break
        }
      }

        const willEat = newHead === food
        const newSnake = willEat
          ? [newHead, ...prevSnake]
          : [newHead, ...prevSnake.slice(0, -1)]

        const snakeBody = new Set(newSnake.slice(1))
        if (snakeBody.has(newHead)) {
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

        // 2. 傳入最新的 currentWallActive，這樣道具就不會生在牆上了
        if (nextScore % 5 === 0) {
          spawnSpeedPowerup(new Set(newSnake), currentWallActive)
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
        setTimeout(() => { setIsBoosted(false) }, 3000)
      }
    }

        // 解決問題 1：當 isBoosted 為 true 時，速度變兩倍
    const currentSpeed = isBoosted ? speed/2 : speed;
    const intervalId = setInterval(gameTick, currentSpeed)
    
    return () => clearInterval(intervalId)

  // 記得這裡要在依賴陣列中加入 isBoosted！這樣狀態一變，就會立刻切換速度
  }, [gameStatus, speed, wallEnabled, score, food, spawnSpeedPowerup, isBoosted])

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
  }
}

