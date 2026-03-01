/**
 * Tutorial Overlay Component
 * Displays tutorial with spotlight effect and tooltip
 */

import { useEffect, useState, useRef } from 'react';
import { useTutorial } from './useTutorial';
import { textToSpeech, playAudioBuffer, ElevenLabsError } from '../../utils/elevenLabs';
import { Button } from '../Button';

export function TutorialOverlay() {
  const {
    isActive,
    currentStep,
    currentStepIndex,
    isNarrationPlaying,
    nextStep,
    previousStep,
    skipTutorial,
    setNarrationPlaying,
  } = useTutorial();

  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [narrationError, setNarrationError] = useState<string | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const audioPlaybackRef = useRef<{ stop: () => void } | null>(null);

  // Calculate target element position
  useEffect(() => {
    if (!isActive || !currentStep) return;

    const updatePosition = () => {
      if (currentStep.targetSelector) {
        const element = document.querySelector(currentStep.targetSelector);
        if (element) {
          const rect = element.getBoundingClientRect();
          setTargetRect(rect);

          // Calculate tooltip position
          const padding = currentStep.highlightPadding || 0;
          const tooltipWidth = 400;
          const tooltipHeight = 200;

          let top = 0;
          let left = 0;

          const position = currentStep.tooltipPosition || 'auto';

          switch (position) {
            case 'right':
              top = rect.top + rect.height / 2 - tooltipHeight / 2;
              left = rect.right + padding + 20;
              break;
            case 'left':
              top = rect.top + rect.height / 2 - tooltipHeight / 2;
              left = rect.left - tooltipWidth - padding - 20;
              break;
            case 'top':
              top = rect.top - tooltipHeight - padding - 20;
              left = rect.left + rect.width / 2 - tooltipWidth / 2;
              break;
            case 'bottom':
              top = rect.bottom + padding + 20;
              left = rect.left + rect.width / 2 - tooltipWidth / 2;
              break;
            case 'auto':
            default:
              // Smart positioning: try right, then left, then bottom, then top
              if (rect.right + tooltipWidth + 40 < window.innerWidth) {
                top = rect.top + rect.height / 2 - tooltipHeight / 2;
                left = rect.right + padding + 20;
              } else if (rect.left - tooltipWidth - 40 > 0) {
                top = rect.top + rect.height / 2 - tooltipHeight / 2;
                left = rect.left - tooltipWidth - padding - 20;
              } else if (rect.bottom + tooltipHeight + 40 < window.innerHeight) {
                top = rect.bottom + padding + 20;
                left = rect.left + rect.width / 2 - tooltipWidth / 2;
              } else {
                top = rect.top - tooltipHeight - padding - 20;
                left = rect.left + rect.width / 2 - tooltipWidth / 2;
              }
          }

          // Clamp to viewport
          top = Math.max(20, Math.min(window.innerHeight - tooltipHeight - 20, top));
          left = Math.max(20, Math.min(window.innerWidth - tooltipWidth - 20, left));

          setTooltipPosition({ top, left });
        } else {
          setTargetRect(null);
        }
      } else {
        setTargetRect(null);
        // Center tooltip if no target
        setTooltipPosition({
          top: window.innerHeight / 2 - 100,
          left: window.innerWidth / 2 - 200,
        });
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [isActive, currentStep]);

  // Load and play narration
  useEffect(() => {
    if (!isActive || !currentStep) return;

    // Stop any currently playing narration when step changes
    if (audioPlaybackRef.current) {
      audioPlaybackRef.current.stop();
      audioPlaybackRef.current = null;
    }

    const loadNarration = async () => {
      setNarrationError(null);
      setNarrationPlaying(true);

      try {
        const audioBuffer = await textToSpeech(currentStep.narrationText);
        audioBufferRef.current = audioBuffer;

        const playback = playAudioBuffer(audioBuffer, 0.8);
        audioPlaybackRef.current = playback;

        await playback.promise;
        setNarrationPlaying(false);
        audioPlaybackRef.current = null;
      } catch (error) {
        console.warn('Narration error:', error);
        if (error instanceof ElevenLabsError) {
          setNarrationError('Add your ElevenLabs API key to apps/web/.env to enable voice narration');
        } else {
          setNarrationError('Failed to load narration');
        }
        setNarrationPlaying(false);
        audioPlaybackRef.current = null;
      }
    };

    loadNarration();

    // Cleanup: stop narration when component unmounts or step changes
    return () => {
      if (audioPlaybackRef.current) {
        audioPlaybackRef.current.stop();
        audioPlaybackRef.current = null;
      }
    };
  }, [isActive, currentStep, setNarrationPlaying]);

  if (!isActive || !currentStep) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        pointerEvents: 'auto',
      }}
    >
      {/* Dark backdrop with spotlight */}
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      >
        <defs>
          <mask id="spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={targetRect.left - (currentStep.highlightPadding || 0)}
                y={targetRect.top - (currentStep.highlightPadding || 0)}
                width={targetRect.width + (currentStep.highlightPadding || 0) * 2}
                height={targetRect.height + (currentStep.highlightPadding || 0) * 2}
                fill="black"
                rx="8"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.75)"
          mask="url(#spotlight-mask)"
        />
      </svg>

      {/* Highlight border */}
      {targetRect && (
        <div
          style={{
            position: 'absolute',
            top: targetRect.top - (currentStep.highlightPadding || 0),
            left: targetRect.left - (currentStep.highlightPadding || 0),
            width: targetRect.width + (currentStep.highlightPadding || 0) * 2,
            height: targetRect.height + (currentStep.highlightPadding || 0) * 2,
            border: '3px solid #ffffff',
            borderRadius: '8px',
            boxShadow:
              '0 0 20px rgba(255, 255, 255, 0.5), inset 0 0 20px rgba(255, 255, 255, 0.2)',
            pointerEvents: 'none',
            animation: 'pulse 2s infinite',
          }}
        />
      )}

      {/* Tooltip */}
      <div
        style={{
          position: 'absolute',
          top: tooltipPosition.top,
          left: tooltipPosition.left,
          width: '400px',
          background: '#f5f1e8',
          border: '3px solid #8b7355',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          pointerEvents: 'auto',
        }}
      >
        {/* Progress indicator */}
        <div
          style={{
            fontSize: '12px',
            fontWeight: 'bold',
            color: '#8b7355',
            marginBottom: '12px',
            textTransform: 'uppercase',
            letterSpacing: '1px',
          }}
        >
          Step {currentStepIndex + 1} of 10
        </div>

        {/* Title */}
        <h3
          style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: '#2c2416',
            marginBottom: '12px',
          }}
        >
          {currentStep.title}
        </h3>

        {/* Description */}
        <p
          style={{
            fontSize: '1rem',
            color: '#5a4d3a',
            marginBottom: '20px',
            lineHeight: '1.6',
          }}
        >
          {currentStep.description}
        </p>

        {/* Narration status */}
        {isNarrationPlaying && (
          <div
            style={{
              fontSize: '0.9rem',
              color: '#8b7355',
              marginBottom: '12px',
              fontStyle: 'italic',
            }}
          >
            Playing narration...
          </div>
        )}

        {/* Narration error with helpful setup instructions */}
        {narrationError && (
          <div
            style={{
              fontSize: '0.85rem',
              color: '#8b7355',
              backgroundColor: 'rgba(139, 115, 85, 0.1)',
              padding: '8px 12px',
              borderRadius: '6px',
              marginBottom: '12px',
              border: '1px solid rgba(139, 115, 85, 0.3)',
            }}
          >
            ℹ️ {narrationError}
          </div>
        )}

        {/* Navigation buttons */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'space-between',
          }}
        >
          <Button
            onClick={previousStep}
            disabled={currentStepIndex === 0}
            style={{
              flex: 1,
              padding: '10px 16px',
              fontSize: '0.9rem',
            }}
          >
            Previous
          </Button>

          <Button
            onClick={nextStep}
            className="button-primary"
            style={{
              flex: 2,
              padding: '10px 16px',
              fontSize: '0.9rem',
              background: '#8b7355',
              color: '#ffffff',
            }}
          >
            {currentStepIndex === 9 ? 'Finish' : 'Next'}
          </Button>

          <Button
            onClick={skipTutorial}
            style={{
              flex: 1,
              padding: '10px 16px',
              fontSize: '0.9rem',
            }}
          >
            Skip
          </Button>
        </div>
      </div>

      {/* Pulse animation keyframes */}
      <style>
        {`
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
              transform: scale(1);
            }
            50% {
              opacity: 0.8;
              transform: scale(1.02);
            }
          }
        `}
      </style>
    </div>
  );
}
