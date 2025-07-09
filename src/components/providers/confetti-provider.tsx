'use client';
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useEffect,
} from 'react';
import ReactConfetti from 'react-confetti';

// Simple hook to get window size to ensure confetti fills the screen
function useWindowSize() {
  const [size, setSize] = useState({width: 0, height: 0});
  useEffect(() => {
    function handleResize() {
      setSize({width: window.innerWidth, height: window.innerHeight});
    }
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return size;
}

type ConfettiContextType = {
  fire: () => void;
};

const ConfettiContext = createContext<ConfettiContextType | null>(null);

export function useConfetti() {
  const context = useContext(ConfettiContext);
  if (!context) {
    throw new Error('useConfetti must be used within a ConfettiProvider');
  }
  return context;
}

export function ConfettiProvider({children}: {children: ReactNode}) {
  const [isFiring, setIsFiring] = useState(false);
  const {width, height} = useWindowSize();

  const fire = useCallback(() => {
    setIsFiring(true);
  }, []);

  return (
    <ConfettiContext.Provider value={{fire}}>
      {children}
      {isFiring && width > 0 && (
        <ReactConfetti
          width={width}
          height={height}
          recycle={false}
          numberOfPieces={500}
          tweenDuration={10000}
          onConfettiComplete={confetti => {
            setIsFiring(false);
            confetti?.clear();
          }}
          style={{zIndex: 9999, position: 'fixed'}}
        />
      )}
    </ConfettiContext.Provider>
  );
}
