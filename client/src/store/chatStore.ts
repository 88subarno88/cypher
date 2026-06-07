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
  conversations: Conversation[];
  messages: Record<string, DecryptedMessage[]>;
  activeConversationId: string | null;

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
      messages: { ...state.messages, [conversationId]: messages },
    })),

  addMessage: (conversationId, message) =>
    set((state) => {
      const existing = state.messages[conversationId] ?? [];
      if (existing.some((m) => m.id === message.id)) {
        return state; // dedupe — already have it
      }
      return {
        messages: {
          ...state.messages,
          [conversationId]: [...existing, message],
        },
      };
    }),

  addOrUpdateConversation: (conv) =>
    set((state) => {
      // Remove the existing entry for this person (if any)
      const withoutThis = state.conversations.filter(
        (c) => c.recipientId !== conv.recipientId,
      );

      // Find the old entry so we can preserve its fields
      const old = state.conversations.find(
        (c) => c.recipientId === conv.recipientId,
      );

      // always put the updated conversation at the FRONT
      // Merge old fields with new (so lastMessage stays if not passed),
      // then prepend to the list so the most recent chat is on top.
      const merged: Conversation = { ...old, ...conv };

      return {
        conversations: [merged, ...withoutThis],
      };
    }),
}));
