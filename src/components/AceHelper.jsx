import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAdvice } from '../engine/pokerAdvisor';
import './AceHelper.css';

function parseMarkdown(text) {
  return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

const LEVELS = [
  { id: 'off', label: 'Off', icon: '🔇', desc: 'No advice' },
  { id: 'nudge', label: 'Nudge', icon: '👆', desc: 'Action only' },
  { id: 'coach', label: 'Coach', icon: '📋', desc: 'Key insights' },
  { id: 'mentor', label: 'Mentor', icon: '🧠', desc: 'Full analysis' },
];

function filterMessage(msg, level) {
  if (level === 'nudge') {
    return { ...msg, lines: [], tierName: undefined, tierColor: undefined, handName: undefined };
  }
  if (level === 'coach') {
    const keyLines = msg.lines.filter(l => l !== '').slice(0, 3);
    return { ...msg, lines: keyLines };
  }
  return msg;
}

export default function AceHelper({ gameState, isPlayerTurn }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [hasNewAdvice, setHasNewAdvice] = useState(false);
  const [level, setLevel] = useState('mentor');
  const [showSettings, setShowSettings] = useState(false);
  const chatEndRef = useRef(null);
  const lastPhaseRef = useRef(null);

  useEffect(() => {
    if (!gameState || level === 'off') return;

    const phase = gameState.phase;
    const player = gameState.players[0];
    if (!player || player.holeCards.length < 2) return;

    const phaseKey = `${gameState.roundNumber}-${phase}-${player.folded}`;
    if (phaseKey === lastPhaseRef.current) return;
    lastPhaseRef.current = phaseKey;

    const advice = getAdvice(gameState);
    if (!advice) return;

    setMessages(prev => {
      const isNewRound = prev.length > 0 && prev[0]?.round !== gameState.roundNumber;
      const base = isNewRound ? [] : prev;

      return [
        ...base,
        {
          id: Date.now(),
          round: gameState.roundNumber,
          phase,
          ...advice,
        },
      ];
    });

    if (!isOpen) {
      setHasNewAdvice(true);
    }
  }, [gameState, isOpen, level]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const toggleOpen = () => {
    setIsOpen(prev => !prev);
    setHasNewAdvice(false);
  };

  const handleLevelChange = (newLevel) => {
    setLevel(newLevel);
    if (newLevel === 'off') {
      setMessages([]);
      setHasNewAdvice(false);
      lastPhaseRef.current = null;
    } else {
      lastPhaseRef.current = null;
    }
  };

  const latestMessage = messages[messages.length - 1];
  const currentLevelInfo = LEVELS.find(l => l.id === level);

  return (
    <div className="ace-helper">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="ace-chat"
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <div className="ace-chat__header">
              <span className="ace-chat__header-avatar">🃏</span>
              <div>
                <span className="ace-chat__header-name">Ace</span>
                <span className="ace-chat__header-sub">
                  {currentLevelInfo.icon} {currentLevelInfo.label}
                </span>
              </div>
              <button
                className={`ace-chat__settings-btn ${showSettings ? 'ace-chat__settings-btn--active' : ''}`}
                onClick={() => setShowSettings(prev => !prev)}
                title="Adjust intensity"
              >
                ⚙
              </button>
              <button className="ace-chat__close" onClick={toggleOpen}>
                ✕
              </button>
            </div>

            <AnimatePresence>
              {showSettings && (
                <motion.div
                  className="ace-levels"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="ace-levels__inner">
                    <span className="ace-levels__label">Advice Intensity</span>
                    <div className="ace-levels__options">
                      {LEVELS.map(l => (
                        <button
                          key={l.id}
                          className={`ace-level-btn ${level === l.id ? 'ace-level-btn--active' : ''}`}
                          onClick={() => handleLevelChange(l.id)}
                        >
                          <span className="ace-level-btn__icon">{l.icon}</span>
                          <span className="ace-level-btn__label">{l.label}</span>
                          <span className="ace-level-btn__desc">{l.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="ace-chat__body">
              {level === 'off' && (
                <div className="ace-chat__empty">
                  <span className="ace-chat__empty-icon">🔇</span>
                  <p>Ace is <strong>turned off</strong>.</p>
                  <p>Click the ⚙ above to change intensity and get advice.</p>
                </div>
              )}

              {level !== 'off' && messages.length === 0 && (
                <div className="ace-chat__empty">
                  <span className="ace-chat__empty-icon">🃏</span>
                  <p>Hey there! I&apos;m <strong>Ace</strong>, your poker advisor.</p>
                  <p>
                    {level === 'nudge'
                      ? "I'll give you quick action hints. Start a hand!"
                      : level === 'coach'
                        ? "I'll share key insights for each street. Let's play!"
                        : "I'll analyze your hand, calculate pot odds, and tell you the optimal play. Start a hand and I'll chime in!"}
                  </p>
                </div>
              )}

              {level !== 'off' && messages.map((rawMsg) => {
                const msg = filterMessage(rawMsg, level);
                return (
                  <div key={msg.id} className="ace-msg">
                    <div className="ace-msg__phase">
                      {msg.phase.toUpperCase()}
                    </div>

                    <div className="ace-msg__action-row">
                      <span className="ace-msg__emoji">{msg.emoji}</span>
                      <span className="ace-msg__action">{msg.summary}</span>
                      {msg.confidence && level !== 'nudge' && (
                        <span className="ace-msg__confidence">{msg.confidence}</span>
                      )}
                    </div>

                    {msg.tierName && (
                      <div
                        className="ace-msg__tier"
                        style={{ borderColor: msg.tierColor, color: msg.tierColor }}
                      >
                        {msg.handName} — {msg.tierName}
                      </div>
                    )}

                    {msg.lines.length > 0 && (
                      <div className="ace-msg__lines">
                        {msg.lines.map((line, i) => (
                          <p
                            key={i}
                            className={`ace-msg__line ${line === '' ? 'ace-msg__line--spacer' : ''}`}
                            dangerouslySetInnerHTML={{ __html: parseMarkdown(line) }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!isOpen && latestMessage && hasNewAdvice && level !== 'off' && (
          <motion.div
            className="ace-peek"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            onClick={toggleOpen}
          >
            <span className="ace-peek__emoji">{latestMessage.emoji}</span>
            <span className="ace-peek__text">{latestMessage.summary}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        className={`ace-avatar-btn ${hasNewAdvice && level !== 'off' ? 'ace-avatar-btn--pulse' : ''} ${level === 'off' ? 'ace-avatar-btn--off' : ''}`}
        onClick={toggleOpen}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        title="Ask Ace for advice"
      >
        <div className="ace-chibi">
          <div className="ace-chibi__hat">🎩</div>
          <div className="ace-chibi__face">
            <div className="ace-chibi__eyes">
              <span className="ace-chibi__eye" />
              <span className="ace-chibi__eye" />
            </div>
            <div className="ace-chibi__mouth" />
          </div>
          <div className="ace-chibi__card">♠</div>
        </div>
        {hasNewAdvice && level !== 'off' && <span className="ace-badge">!</span>}
      </motion.button>
    </div>
  );
}
