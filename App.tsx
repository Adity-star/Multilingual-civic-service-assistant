
import React, { useState } from 'react';
import { ConversationView } from './components/ConversationView';
import { WelcomeView } from './components/WelcomeView';
import { LogoIcon } from './components/Icons';

const App: React.FC = () => {
  const [isSessionActive, setIsSessionActive] = useState(false);

  const handleStartSession = () => {
    setIsSessionActive(true);
  };

  const handleEndSession = () => {
    setIsSessionActive(false);
  };

  return (
    <div className="min-h-screen bg-base-100 text-gray-100 flex flex-col items-center justify-center p-4 font-sans">
      <header className="w-full max-w-4xl mx-auto p-4 flex items-center justify-between border-b border-base-300 mb-8">
        <div className="flex items-center space-x-3">
          <LogoIcon className="h-8 w-8 text-brand-secondary" />
          <h1 className="text-xl md:text-2xl font-bold text-gray-100">
            Civic Service Assistant
          </h1>
        </div>
      </header>
      
      <main className="w-full max-w-4xl flex-grow flex flex-col items-center">
        {isSessionActive ? (
          <ConversationView onEndSession={handleEndSession} />
        ) : (
          <WelcomeView onStartSession={handleStartSession} />
        )}
      </main>

      <footer className="w-full max-w-4xl mx-auto p-4 text-center text-xs text-gray-400 mt-8">
        <p>Powered by Gemini. For demonstration purposes only.</p>
      </footer>
    </div>
  );
};

export default App;
