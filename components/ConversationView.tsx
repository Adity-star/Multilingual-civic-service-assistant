import React, { useState, useEffect, useRef, useCallback } from 'react';
// Fix: Removed `LiveSession` from import as it is not an exported member.
import type { LiveServerMessage } from '@google/genai';
import { startLiveSession } from '../services/gemini';
import { encode, decode, decodeAudioData } from '../utils/audio';
import type { TranscriptMessage, TicketData } from '../types';
import { TicketCard } from './TicketCard';
import { CameraIcon, MicrophoneIcon, StopIcon, ProcessingIcon } from './Icons';

interface ConversationViewProps {
  onEndSession: () => void;
}

export const ConversationView: React.FC<ConversationViewProps> = ({ onEndSession }) => {
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [confirmationMessage, setConfirmationMessage] = useState<string>('');
  const [status, setStatus] = useState<'idle' | 'listening' | 'processing' | 'finished' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);

  // Fix: Used `ReturnType` to infer the type of the promise returned by `startLiveSession`.
  const sessionPromiseRef = useRef<ReturnType<typeof startLiveSession> | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const currentInputTranscriptionRef = useRef('');
  const currentOutputTranscriptionRef = useRef('');

  const stopAudioProcessing = useCallback(() => {
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    if (mediaStreamSourceRef.current) {
      mediaStreamSourceRef.current.disconnect();
      mediaStreamSourceRef.current = null;
    }
    if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
      inputAudioContextRef.current.close().catch(console.error);
    }
    if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
      outputAudioContextRef.current.close().catch(console.error);
    }
    audioSourcesRef.current.forEach(source => source.stop());
    audioSourcesRef.current.clear();
  }, []);

  const handleEnd = useCallback(() => {
    setStatus('finished');
    if (sessionPromiseRef.current) {
        sessionPromiseRef.current.then(session => session.close());
        sessionPromiseRef.current = null;
    }
    stopAudioProcessing();
  }, [stopAudioProcessing]);

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            setPhoto(reader.result as string);
        };
        reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
      fileInputRef.current?.click();
  };


  const startConversation = useCallback(async () => {
    setStatus('listening');
    setError(null);
    setTicket(null);
    setConfirmationMessage('');
    setTranscript([]);
    setPhoto(null);

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        
        sessionPromiseRef.current = startLiveSession({
            onMessage: async (message: LiveServerMessage) => {
                // Process transcriptions
                if (message.serverContent?.inputTranscription) {
                    currentInputTranscriptionRef.current += message.serverContent.inputTranscription.text;
                }
                if (message.serverContent?.outputTranscription) {
                    currentOutputTranscriptionRef.current += message.serverContent.outputTranscription.text;
                }
                
                if(message.serverContent?.turnComplete) {
                    const userInput = currentInputTranscriptionRef.current.trim();
                    const modelOutput = currentOutputTranscriptionRef.current.trim();

                    if(userInput || modelOutput) {
                      setTranscript(prev => [
                          ...prev,
                          ...(userInput ? [{ id: Date.now(), author: 'user' as const, text: userInput }] : []),
                          ...(modelOutput ? [{ id: Date.now() + 1, author: 'model' as const, text: modelOutput }] : []),
                      ]);
                    }
                    
                    // Check for JSON ticket
                    const jsonRegex = /{[^}]*}/s;
                    const match = modelOutput.match(jsonRegex);
                    if (match) {
                        try {
                            const ticketId = `CIV-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
                            const parsedJson = JSON.parse(match[0]);
                            const finalTicket = { ...parsedJson, ticket_id: ticketId };

                            if (photo) {
                                finalTicket.photo_attached = true;
                                finalTicket.photo_url = photo;
                            }
                            setTicket(finalTicket);
                            
                            const confirmationText = modelOutput.substring(match.index! + match[0].length).trim();
                            setConfirmationMessage(confirmationText.replace('[TICKET_ID_PLACEHOLDER]', ticketId));

                            handleEnd();
                        } catch (e) {
                            console.error("Failed to parse JSON:", e);
                        }
                    }

                    currentInputTranscriptionRef.current = '';
                    currentOutputTranscriptionRef.current = '';
                }

                // Process audio
                const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                if (audioData && outputAudioContextRef.current) {
                    const audioBuffer = await decodeAudioData(decode(audioData), outputAudioContextRef.current, 24000, 1);
                    const source = outputAudioContextRef.current.createBufferSource();
                    source.buffer = audioBuffer;
                    source.connect(outputAudioContextRef.current.destination);
                    
                    const currentTime = outputAudioContextRef.current.currentTime;
                    const startTime = Math.max(currentTime, nextStartTimeRef.current);
                    source.start(startTime);
                    
                    nextStartTimeRef.current = startTime + audioBuffer.duration;
                    audioSourcesRef.current.add(source);
                    source.onended = () => audioSourcesRef.current.delete(source);
                }

                const interrupted = message.serverContent?.interrupted;
                if (interrupted) {
                  for (const source of audioSourcesRef.current.values()) {
                    source.stop();
                    audioSourcesRef.current.delete(source);
                  }
                  nextStartTimeRef.current = 0;
                }
            },
            onError: (err: ErrorEvent) => {
                console.error('Session error:', err);
                setError('An error occurred with the connection.');
                setStatus('error');
                handleEnd();
            },
            onClose: () => {
                console.log('Session closed.');
                setStatus(currentStatus => {
                    if (currentStatus !== 'finished' && currentStatus !== 'error') {
                       handleEnd();
                    }
                    return currentStatus;
                });
            }
        });

        // Start streaming mic input
        mediaStreamSourceRef.current = inputAudioContextRef.current.createMediaStreamSource(stream);
        scriptProcessorRef.current = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
        
        scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
            const int16 = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
                int16[i] = inputData[i] * 32768;
            }
            const base64 = encode(new Uint8Array(int16.buffer));
            
            if (sessionPromiseRef.current) {
                sessionPromiseRef.current.then((session) => {
                    session.sendRealtimeInput({ media: { data: base64, mimeType: 'audio/pcm;rate=16000' } });
                });
            }
        };

        mediaStreamSourceRef.current.connect(scriptProcessorRef.current);
        scriptProcessorRef.current.connect(inputAudioContextRef.current.destination);

    } catch (err) {
        console.error('Error starting conversation:', err);
        setError('Could not access microphone. Please check your permissions.');
        setStatus('error');
    }
  }, [handleEnd]);

  useEffect(() => {
    startConversation();
    return () => {
        handleEnd();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="w-full h-full flex flex-col bg-base-200 rounded-lg shadow-xl p-4 md:p-6">
      <div className="flex-grow overflow-y-auto pr-2 space-y-4 mb-4">
        {transcript.map((msg) => (
          <div key={msg.id} className={`flex items-start gap-3 ${msg.author === 'user' ? 'justify-end' : ''}`}>
            {msg.author === 'model' && (
              <div className="w-8 h-8 rounded-full bg-brand-primary flex-shrink-0 flex items-center justify-center font-bold">A</div>
            )}
            <div className={`p-3 rounded-lg max-w-lg ${msg.author === 'user' ? 'bg-brand-secondary text-white' : 'bg-base-300'}`}>
              <p>{msg.text}</p>
            </div>
             {msg.author === 'user' && (
              <div className="w-8 h-8 rounded-full bg-gray-500 flex-shrink-0 flex items-center justify-center font-bold">U</div>
            )}
          </div>
        ))}
        {ticket && <TicketCard ticket={ticket} />}
      </div>
      
      <div className="flex-shrink-0 pt-4 border-t border-base-300 flex flex-col items-center justify-center space-y-4">
        {error && <p className="text-red-400">{error}</p>}
        {confirmationMessage && <p className="text-green-400 text-center font-semibold">{confirmationMessage}</p>}
        
        <div className="flex items-center justify-center gap-4">
            {status === 'listening' && (
                <button onClick={handleEnd} className="bg-red-600 hover:bg-red-700 text-white rounded-full p-4 flex items-center justify-center transition-all duration-300 transform hover:scale-105" aria-label="Stop conversation">
                    <StopIcon className="h-8 w-8" />
                </button>
            )}
            
            {(status === 'listening' || status === 'processing') && (
                <>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handlePhotoUpload}
                        className="hidden"
                        accept="image/*"
                    />
                    <button
                        onClick={triggerFileInput}
                        className="bg-gray-600 hover:bg-gray-700 text-white rounded-full p-4 flex items-center justify-center transition-all duration-300 transform hover:scale-105"
                        aria-label="Upload a photo"
                    >
                        <CameraIcon className="h-8 w-8" />
                    </button>
                </>
            )}
        </div>

        {photo && (status === 'listening' || status === 'processing') && (
            <div className="mt-2 text-center">
                <p className="text-xs text-gray-400 mb-1">Photo attached:</p>
                <img src={photo} alt="Upload preview" className="h-20 w-20 rounded-lg object-cover inline-block border-2 border-base-300" />
            </div>
        )}

        {status === 'processing' && <ProcessingIcon className="h-12 w-12 text-brand-secondary animate-spin" />}
        
        {status === 'finished' && (
            <button onClick={onEndSession} className="bg-brand-secondary hover:bg-brand-primary text-white font-bold py-2 px-6 rounded-lg transition-colors">
                Start New Request
            </button>
        )}

        <div className="text-sm text-gray-400 text-center">
            {status === 'listening' && "Listening... Speak now or upload a photo."}
            {status === 'processing' && "Processing your request..."}
            {status === 'finished' && "Your request has been filed."}
        </div>
      </div>
    </div>
  );
};