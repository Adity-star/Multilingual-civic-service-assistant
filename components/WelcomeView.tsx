
import React from 'react';
import { MicrophoneIcon } from './Icons';

interface WelcomeViewProps {
  onStartSession: () => void;
}

export const WelcomeView: React.FC<WelcomeViewProps> = ({ onStartSession }) => {
  return (
    <div className="text-center flex flex-col items-center justify-center h-full max-w-2xl mx-auto">
      <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
        Report a Civic Issue
      </h2>
      <p className="text-lg text-gray-300 mb-8">
        Use your voice to file a service request in English or Spanish. We'll guide you through the process.
      </p>
      <button
        onClick={onStartSession}
        className="group flex items-center justify-center gap-3 bg-brand-secondary hover:bg-brand-primary text-white font-bold py-4 px-8 rounded-full text-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
      >
        <MicrophoneIcon className="h-6 w-6" />
        Start Conversation
      </button>
      <div className="mt-12 p-6 bg-base-200 rounded-lg border border-base-300 w-full">
        <h3 className="text-xl font-semibold mb-3 text-left">How it works:</h3>
        <ul className="list-decimal list-inside text-left space-y-2 text-gray-300">
            <li>Press "Start Conversation" and grant microphone access.</li>
            <li>Describe the issue you want to report (e.g., "pothole", "water leak").</li>
            <li>Answer a few clarifying questions from our assistant.</li>
            <li>We'll confirm the details and file your request.</li>
        </ul>
      </div>
    </div>
  );
};
