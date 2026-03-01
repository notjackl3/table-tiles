/**
 * Tutorial Context and Hook
 * Manages tutorial state and provides tutorial control methods
 */

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  narrationText: string;
  targetSelector?: string;
  tooltipPosition?: 'top' | 'right' | 'bottom' | 'left' | 'auto';
  highlightPadding?: number;
}

interface TutorialContextType {
  isActive: boolean;
  currentStepIndex: number;
  currentStep: TutorialStep | null;
  isNarrationPlaying: boolean;
  completedSteps: Set<string>;

  startTutorial: () => void;
  stopTutorial: () => void;
  nextStep: () => void;
  previousStep: () => void;
  skipTutorial: () => void;
  setNarrationPlaying: (playing: boolean) => void;
}

const TutorialContext = createContext<TutorialContextType | null>(null);

export function useTutorial() {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error('useTutorial must be used within TutorialProvider');
  }
  return context;
}

// Tutorial steps configuration
const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Table Tiles!',
    description: 'Let me show you around the game setup. This tutorial will guide you through all the features.',
    narrationText: 'Welcome to Table Tiles! Let me show you around the game setup. This tutorial will guide you through all the features.',
    tooltipPosition: 'bottom',
  },
  {
    id: 'hype-level',
    title: 'Announcer Hype Level',
    description: 'Choose how enthusiastic you want the voice announcer to be during gameplay. Low is subtle, Medium is balanced, and High is super energetic!',
    narrationText: 'First, choose your announcer hype level. This controls how enthusiastic the voice announcer will be during gameplay. Low is subtle, Medium is balanced, and High is super energetic!',
    targetSelector: '[data-tutorial="hype-level"]',
    tooltipPosition: 'right',
    highlightPadding: 8,
  },
  {
    id: 'announcements',
    title: 'Voice Announcements',
    description: 'Toggle voice announcements for combos and milestones. The announcer will celebrate your achievements!',
    narrationText: 'Toggle voice announcements to hear the announcer celebrate your combos and milestones during gameplay.',
    targetSelector: '[data-tutorial="announcements"]',
    tooltipPosition: 'right',
    highlightPadding: 8,
  },
  {
    id: 'voice-effects',
    title: 'Voice Effects',
    description: 'Enable impact sounds and celebration effects that play when you hit notes perfectly.',
    narrationText: 'Voice effects add impact sounds and celebrations when you hit notes perfectly.',
    targetSelector: '[data-tutorial="voice-effects"]',
    tooltipPosition: 'right',
    highlightPadding: 8,
  },
  {
    id: 'visual-effects',
    title: 'Visual Effects',
    description: 'Turn on visual effects like white flashes and particle effects for a more immersive experience.',
    narrationText: 'Visual effects add white flashes and particles for a more immersive gaming experience.',
    targetSelector: '[data-tutorial="visual-effects"]',
    tooltipPosition: 'right',
    highlightPadding: 8,
  },
  {
    id: 'screen-shake',
    title: 'Screen Shake',
    description: 'Enable subtle screen shake when you hit perfect notes to feel the impact.',
    narrationText: 'Screen shake adds a subtle shake effect when you hit perfect notes, so you can really feel the impact.',
    targetSelector: '[data-tutorial="screen-shake"]',
    tooltipPosition: 'right',
    highlightPadding: 8,
  },
  {
    id: 'song-selection',
    title: 'Song Selection',
    description: 'Browse and select songs to play. Click on a song to preview it, then select it for your game.',
    narrationText: 'On the right side, you can browse and select songs to play. Click on a song to preview it, then select it when you are ready.',
    targetSelector: '[data-tutorial="song-selection"]',
    tooltipPosition: 'left',
    highlightPadding: 8,
  },
  {
    id: 'settings-panel',
    title: 'Settings Panel',
    description: 'Adjust game settings like sensitivity, velocity threshold, and detection thresholds for optimal hand tracking.',
    narrationText: 'The settings panel lets you fine-tune hand tracking sensitivity, velocity thresholds, and other detection parameters for the best gameplay experience.',
    targetSelector: '[data-tutorial="settings-panel"]',
    tooltipPosition: 'right',
    highlightPadding: 8,
  },
  {
    id: 'start-game',
    title: 'Start Game',
    description: "When you're ready, click this button to start playing! Make sure to select a song first.",
    narrationText: 'When you are ready to play, click the Start Game button. Make sure you have selected a song first!',
    targetSelector: '[data-tutorial="start-game"]',
    tooltipPosition: 'top',
    highlightPadding: 8,
  },
  {
    id: 'completion',
    title: "You're All Set!",
    description: "You've completed the tutorial! Now you know how to customize your game experience. Have fun playing Table Tiles!",
    narrationText: 'You are all set! You now know how to customize your game experience. Have fun playing Table Tiles!',
    tooltipPosition: 'bottom',
  },
];

interface TutorialProviderProps {
  children: ReactNode;
}

export function TutorialProvider({ children }: TutorialProviderProps) {
  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isNarrationPlaying, setIsNarrationPlaying] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(
    new Set(JSON.parse(localStorage.getItem('tutorial-completed-steps') || '[]'))
  );

  const currentStep = isActive ? TUTORIAL_STEPS[currentStepIndex] : null;

  const startTutorial = useCallback(() => {
    setIsActive(true);
    setCurrentStepIndex(0);
  }, []);

  const stopTutorial = useCallback(() => {
    setIsActive(false);
    setCurrentStepIndex(0);
    setIsNarrationPlaying(false);
  }, []);

  const nextStep = useCallback(() => {
    if (currentStep) {
      setCompletedSteps((prev) => {
        const newSet = new Set(prev);
        newSet.add(currentStep.id);
        localStorage.setItem('tutorial-completed-steps', JSON.stringify([...newSet]));
        return newSet;
      });
    }

    if (currentStepIndex < TUTORIAL_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      stopTutorial();
    }
  }, [currentStepIndex, currentStep, stopTutorial]);

  const previousStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  }, [currentStepIndex]);

  const skipTutorial = useCallback(() => {
    // Mark all steps as completed
    const allStepIds = TUTORIAL_STEPS.map((step) => step.id);
    setCompletedSteps(new Set(allStepIds));
    localStorage.setItem('tutorial-completed-steps', JSON.stringify(allStepIds));
    stopTutorial();
  }, [stopTutorial]);

  const value: TutorialContextType = {
    isActive,
    currentStepIndex,
    currentStep,
    isNarrationPlaying,
    completedSteps,
    startTutorial,
    stopTutorial,
    nextStep,
    previousStep,
    skipTutorial,
    setNarrationPlaying: setIsNarrationPlaying,
  };

  return <TutorialContext.Provider value={value}>{children}</TutorialContext.Provider>;
}
