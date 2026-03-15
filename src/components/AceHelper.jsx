import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAdvice } from '../engine/pokerAdvisor';
import './AceHelper.css';

function parseMarkdown(text) {
  return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

export default function AceHelper({ gameState, isPlayerTurn }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [hasNewAdvice, setHasNewAdvice] = useState(false);
  const chatEndRef = useRef(null);
  const lastPhaseRef = useRef(null);

  // Generate new advice whenever it's the player's turn or phase changes
  useEffect(() => {
    if (!gameState) return;

    const phase = gameState.phase;
    const player = gameState.players[0];
    if (!player || player.holeCards.length < 2) return;

    const phaseKey = `${gameState.roundNumber}-${phase}-${player.folded}`;
    if (phaseKey === lastPhaseRef.current) return;
    lastPhaseRef.current = phaseKey;

    const advice = getAdvice(gameState);
    if (!advice) return;

    setMessages(prev => {
      // If it's a new round, clear old messages
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
  }, [gameState, isOpen]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const toggleOpen = () => {
    setIsOpen(prev => !prev);
    setHasNewAdvice(false);
  };

  const latestMessage = messages[messages.length - 1];

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
                <span className="ace-chat__header-sub">Poker Advisor</span>
              </div>
              <button className="ace-chat__close" onClick={toggleOpen}>
                ✕
              </button>
            </div>

            <div className="ace-chat__body">
              {messages.length === 0 && (
                <div className="ace-chat__empty">
                  <span className="ace-chat__empty-icon">🃏</span>
                  <p>Hey there! I&apos;m <strong>Ace</strong>, your poker advisor.</p>
                  <p>I&apos;ll analyze your hand, calculate pot odds, and tell you the optimal play. Start a hand and I&apos;ll chime in!</p>
                </div>
              )}

              {messages.map((msg) => (
                <div key={msg.id} className="ace-msg">
                  <div className="ace-msg__phase">
                    {msg.phase.toUpperCase()}
                  </div>

                  {/* Action recommendation pill */}
                  <div className="ace-msg__action-row">
                    <span className="ace-msg__emoji">{msg.emoji}</span>
                    <span className="ace-msg__action">{msg.summary}</span>
                    {msg.confidence && (
                      <span className="ace-msg__confidence">{msg.confidence}</span>
                    )}
                  </div>

                  {/* Tier badge for preflop */}
                  {msg.tierName && (
                    <div
                      className="ace-msg__tier"
                      style={{ borderColor: msg.tierColor, color: msg.tierColor }}
                    >
                      {msg.handName} — {msg.tierName}
                    </div>
                  )}

                  {/* Advice lines */}
                  <div className="ace-msg__lines">
                    {msg.lines.map((line, i) => (
                      <p
                        key={i}
                        className={`ace-msg__line ${line === '' ? 'ace-msg__line--spacer' : ''}`}
                        dangerouslySetInnerHTML={{ __html: parseMarkdown(line) }}
                      />
                    ))}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Peek bubble — shows latest advice summary when closed */}
      <AnimatePresence>
        {!isOpen && latestMessage && hasNewAdvice && (
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

      {/* Chibi avatar button */}
      <motion.button
        className={`ace-avatar-btn ${hasNewAdvice ? 'ace-avatar-btn--pulse' : ''}`}
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
        {hasNewAdvice && <span className="ace-badge">!</span>}
      </motion.button>
    </div>
  );
}
