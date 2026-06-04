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
  // state
  conversations: Conversation[];
  messages: Record<string, DecryptedMessage[]>;
  activeConversationId: string | null;

  // actions
  setConversations(conversations: Conversation[]): void;
  setActiveConversation(id: string | null): void;
  setHistory(conversationId: string, messages: DecryptedMessage[]): void;
  addMessage(conversationId: string, message: DecryptedMessage): void;

  addOrUpdateConversation(conv: Conversation): void;
}

export const useChatStore = create<ChatState>()((set) => ({
  conversations: [],
  messages: {},
  activeConversationId: null,

  setConversations: (conversations) => set({ conversations }),

  setActiveConversation: (id) => set({ activeConversationId: id }),

  setHistory: (conversationId, messages) =>
    set((state) => ({
      messages: { ...state.messages, [conversationId]: messages }, // state.messages keeps all other convos intact
    })),

  addMessage: (conversationId, message) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: [
          ...(state.messages[conversationId] ?? []), // ?? [] = first message ever in this convo defaults to empty array
          message,
        ],
      },
    })),

  //   Check if a conversation with this recipientId already exists.
  //   If YES  update its lastMessage and lastMessageAt in place.
  //   If NO   add it to the FRONT of the array (most recent first).
  addOrUpdateConversation: (conv) =>
    set((state) => {
      const exists = state.conversations.find(
        (c) => c.recipientId === conv.recipientId,
      );

      if (exists) {
        // Update the existing entry with new lastMessage preview
        return {
          conversations: state.conversations.map((c) =>
            c.recipientId === conv.recipientId
              ? { ...c, ...conv } // spread keeps old fields, new fields override
              : c,
          ),
        };
      }

      return {
        conversations: [conv, ...state.conversations],
      };
    }),
}));
