import { useCallback, useEffect, useRef, useState } from 'react'

export function useGameAudio() {
    // === 新增：BGM 音量控制 ===
    const bgmRef = useRef<HTMLAudioElement | null>(null)
    const eatSoundRef = useRef<HTMLAudioElement | null>(null)
    const gameOverSoundRef = useRef<HTMLAudioElement | null>(null)

    const [isMuted, setIsMuted] = useState(false)
    const isMutedRef = useRef(false) // 用 ref 保持最新值給 closure 用
    
    const [volume, setVolume] = useState(0.3) // 預設 30%

    useEffect(() => {
        if (!bgmRef.current) {
            bgmRef.current = new Audio('/audio/kazeem_faheem-game_bg_music_loop-472208.mp3')
            bgmRef.current.loop = true
        }

        if (!eatSoundRef.current) {
            eatSoundRef.current = new Audio('/audio/freesound_community-eating-sound-effect-36186.mp3')
        }

        if (!gameOverSoundRef.current) {
            gameOverSoundRef.current = new Audio('/audio/freesound_community-game-over-arcade-6435.mp3')
        }

        applyVolume()
    }, [])

    const applyVolume = () => {
        const actualVolume = isMutedRef.current ? 0 : volume
        if (bgmRef.current) bgmRef.current.volume = actualVolume
        if (eatSoundRef.current) eatSoundRef.current.volume = actualVolume
        if (gameOverSoundRef.current) gameOverSoundRef.current.volume = actualVolume
    }

    useEffect(() => {
        applyVolume()
    }, [volume])

    const toggleMute = useCallback(() => {
        setIsMuted(prev => {
            const newMuted = !prev
            isMutedRef.current = newMuted
            applyVolume()
            return newMuted
        })
    }, [volume])

    const playBgm = useCallback(() => {
        if (!isMutedRef.current) {
        bgmRef.current?.play()
        }
    }, [])

    const pauseBgm = useCallback(() => {
        bgmRef.current?.pause()
    }, [])

    const resetBgm = useCallback(() => {
        if (bgmRef.current) {
        bgmRef.current.currentTime = 0
        }
    }, [])

    const playEat = useCallback(() => {
        if (eatSoundRef.current) {
        eatSoundRef.current.currentTime = 0
        eatSoundRef.current.play()
        }
    }, [])

    const playGameOver = useCallback(() => {
        if (gameOverSoundRef.current) {
        gameOverSoundRef.current.currentTime = 0
        gameOverSoundRef.current.play()
        }
    }, [])

    return {
    isMuted,
    volume,
    setVolume,
    toggleMute,
    playBgm,
    pauseBgm,
    resetBgm,
    playEat,
    playGameOver,
  }
}