export interface User {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  customId?: string;
  lastSeen?: number;
  isOnline?: boolean;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  timestamp: number;
  isAI?: boolean;
}

export interface Chat {
  id: string;
  participantIds: string[];
  lastMessage?: string;
  lastMessageTime?: number;
  isGroup?: boolean;
  name?: string; // For groups
  photoURL?: string; // For groups
}
