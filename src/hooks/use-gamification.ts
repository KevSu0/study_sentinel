'use client';
import {useState, useEffect, useCallback} from 'react';

const SCORE_KEY = 'studySentinelScore';

// Simple leveling system: 100 points per level
const POINTS_PER_LEVEL = 100;

export function useGamification() {
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // This effect runs only on the client
    const savedScore = parseInt(localStorage.getItem(SCORE_KEY) || '0', 10);
    setScore(savedScore);
    setLevel(Math.floor(savedScore / POINTS_PER_LEVEL) + 1);
    setIsLoaded(true);
  }, []);

  const addPoints = useCallback((points: number) => {
    setScore(prevScore => {
      const newScore = prevScore + points;
      const newLevel = Math.floor(newScore / POINTS_PER_LEVEL) + 1;
      localStorage.setItem(SCORE_KEY, String(newScore));
      setLevel(newLevel);
      return newScore;
    });
  }, []);

  const subtractPoints = useCallback((points: number) => {
    setScore(prevScore => {
      const newScore = Math.max(0, prevScore - points);
      const newLevel = Math.floor(newScore / POINTS_PER_LEVEL) + 1;
      localStorage.setItem(SCORE_KEY, String(newScore));
      setLevel(newLevel);
      return newScore;
    });
  }, []);

  const levelProgress = isLoaded ? ((score % POINTS_PER_LEVEL) / POINTS_PER_LEVEL) * 100 : 0;
  const pointsToNextLevel = isLoaded ? POINTS_PER_LEVEL - (score % POINTS_PER_LEVEL) : POINTS_PER_LEVEL;

  return { isLoaded, score, level, levelProgress, addPoints, subtractPoints, pointsToNextLevel };
}
