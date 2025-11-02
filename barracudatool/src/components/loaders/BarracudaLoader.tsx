'use client';

import React from 'react';

interface BarracudaLoaderProps {
  text?: string;
}

const BarracudaLoader: React.FC<BarracudaLoaderProps> = ({ text = "LOADING..." }) => {
  return (
    <>
      <style jsx>{`
        .barracuda-loader-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          padding: 2rem;
        }
        .barracuda-svg {
          width: 150px;
          height: auto;
        }
        .barracuda-path {
          stroke: #ff00ff;
          stroke-width: 3;
          stroke-linecap: round;
          fill: none;
          stroke-dasharray: 600;
          stroke-dashoffset: 600;
          animation: draw 2s ease-out forwards, pulse 1.5s ease-in-out infinite alternate;
        }
        .loader-text {
            color: #00ffff;
            font-family: 'Orbitron', sans-serif;
            font-size: 1rem;
            text-transform: uppercase;
            text-shadow: 0 0 8px rgba(0, 255, 255, 0.7);
            animation: text-flicker 2s linear infinite;
        }
        @keyframes draw {
          to {
            stroke-dashoffset: 0;
          }
        }
        @keyframes pulse {
          from {
            stroke-width: 3;
            filter: drop-shadow(0 0 4px #ff00ff);
          }
          to {
            stroke-width: 3.5;
            filter: drop-shadow(0 0 12px #ff00ff);
          }
        }
        @keyframes text-flicker {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
        }
      `}</style>
      <div className="barracuda-loader-container">
        <svg className="barracuda-svg" viewBox="0 0 200 50" xmlns="http://www.w3.org/2000/svg">
          <path
            className="barracuda-path"
            d="M 5,25 C 20,10 80,10 100,25 C 120,40 180,40 195,25 M 170,25 L 198,25 M 180,25 L 200,18 M 180,25 L 200,32"
          />
        </svg>
        <span className="loader-text">{text}</span>
      </div>
    </>
  );
};

export default BarracudaLoader;
