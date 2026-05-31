import { create } from "zustand";
import type { DecryptedMessage } from "../../../shared";

export interface Conversation {
  id: string;
  recipientId: string;
  recipientUsername: string;
  lastMessage?: string;
  lastMessageAt?: string;
}

export interface ChatState {
  //state
  conversations: Conversation[];
  messages: Record<string, DecryptedMessage[]>;
  activeConversationId: string | null;
  //action
  setConversations(conversations: Conversation[]): void;
  setHistory(conversationId: string, messages: DecryptedMessage[]): void;
  setHistory(conversationId: string, messages: DecryptedMessage[]): void;
  addMessage(conversationId: string, message: DecryptedMessage): void;
}

export const useChatStore = create<ChatState>()((set) => ({
  conversations: [],
  messages: {},
  activeConversationId: null,
  setConversations: (conversations) => set({ conversations }),
  setActiveConversation: (id: string | null) =>
    set({ activeConversationId: id }),
  setHistory: (conversationId, messages) =>
    set((state) => ({
      messages: { ...state.messages, [conversationId]: messages }, //state.message keeps all messages safe intact 
    })),
  addMessage: (conversationId, message) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: [...(state.messages[conversationId]??[]), message],   // ... adds old array into existing array 
      },                                                                        // ?? is first time chatting defaults to [] else loads prev convo 
    })),
}));
