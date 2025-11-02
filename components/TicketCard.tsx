import React, { useState } from 'react';
import type { TicketData } from '../types';
import { ProcessingIcon } from './Icons';

interface TicketCardProps {
  ticket: TicketData;
}

const TicketField: React.FC<{ label: string; value: string | boolean }> = ({ label, value }) => (
  <div>
    <p className="text-sm font-semibold text-gray-400 uppercase">{label}</p>
    <p className="text-md text-white">{String(value)}</p>
  </div>
);

const POSSIBLE_STATUSES = [
    'In Review',
    'Pending Assignment',
    'Scheduled for Inspection on a future date.',
    'Work Crew Dispatched',
];

export const TicketCard: React.FC<TicketCardProps> = ({ ticket }) => {
    const [ticketStatus, setTicketStatus] = useState<string | null>(null);
    const [isChecking, setIsChecking] = useState(false);

    const handleCheckStatus = () => {
        setIsChecking(true);
        setTicketStatus(null);

        setTimeout(() => {
            const randomStatus = POSSIBLE_STATUSES[Math.floor(Math.random() * POSSIBLE_STATUSES.length)];
            setTicketStatus(randomStatus);
            setIsChecking(false);
        }, 1500);
    };

  return (
    <div className="bg-base-300 rounded-lg p-6 border border-brand-secondary shadow-lg my-4 animate-fade-in">
      <h3 className="text-xl font-bold text-white mb-4 border-b border-base-100 pb-2">
        Service Request Summary
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ticket.ticket_id && <TicketField label="Ticket ID" value={ticket.ticket_id} />}
        <TicketField label="Language" value={ticket.language} />
        <TicketField label="Category" value={ticket.category} />
        <div className="md:col-span-2">
            <TicketField label="Description" value={ticket.description} />
        </div>
        <TicketField label="Photo Attached" value={ticket.photo_attached} />
        {ticket.photo_attached && ticket.photo_url && (
          <div className="md:col-span-2">
            <p className="text-sm font-semibold text-gray-400 uppercase mb-2">Attached Photo</p>
            <img src={ticket.photo_url} alt="Service request photo" className="rounded-lg max-h-64 w-auto border-2 border-base-100" />
          </div>
        )}
      </div>
      <div className="mt-6 pt-4 border-t border-base-100">
        <h4 className="text-lg font-semibold text-white mb-2">Ticket Status</h4>
        <div className="flex items-center gap-4">
            <button
                onClick={handleCheckStatus}
                disabled={isChecking}
                className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-lg transition-colors"
            >
                {isChecking ? 'Checking...' : 'Check Status'}
            </button>
            {isChecking && <ProcessingIcon className="h-6 w-6 text-brand-secondary animate-spin" />}
        </div>
        {ticketStatus && !isChecking && (
            <div className="mt-4 p-3 bg-base-100 rounded-lg">
                <p className="text-gray-300"><span className="font-bold text-white">Current Status:</span> {ticketStatus}</p>
            </div>
        )}
      </div>
    </div>
  );
};