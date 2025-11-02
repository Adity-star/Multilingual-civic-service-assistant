
export interface TranscriptMessage {
  id: number;
  author: 'user' | 'model';
  text: string;
}

export interface TicketData {
  user_id: string;
  language: 'en' | 'es';
  category: 'road' | 'water' | 'electricity' | 'waste';
  description: string;
  photo_attached: boolean;
  photo_url: string;
  ticket_id?: string;
}