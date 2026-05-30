// ── WHAT IS THIS FILE? ────────────────────────────────────
// A Zustand store that holds conversations and decrypted messages.
// On Day 3 this is a STUB — define the shape and basic actions
// but leave the body of complex actions as TODO comments.
// You fill this out properly on Day 8.
//
// ── WHY WRITE IT NOW? ─────────────────────────────────────
// Other files (useKeyPair.ts, socket/handlers.ts on Day 7) will
// import from this store. If it does not exist, TypeScript errors
// will block you. Writing the stub now prevents that.
//
// ── RESOURCES TO READ ─────────────────────────────────────
// Zustand getting started:
//   https://docs.pmnd.rs/zustand/getting-started/introduction
// Focus on: how to store arrays in Zustand state, how to
// update nested state with set().
//
// ── WHAT TYPES TO DEFINE ──────────────────────────────────
// First define a Conversation type (or import from @cipher/shared if available):
//   interface Conversation {
//     id: string              // a unique ID for this conversation
//     recipientId: string     // the other user's ID
//     recipientUsername: string
//     lastMessage?: string    // preview of the last decrypted message
//     lastMessageAt?: string  // timestamp of last message
//   }
//
// Import DecryptedMessage from "@cipher/shared" — you defined it on Day 1.
//
// Then define ChatState:
//
// STATE FIELDS:
//   conversations: Conversation[]
//     → List of all active conversations
//     → Empty array [] initially
//
//   messages: Record<string, DecryptedMessage[]>
//     → A dictionary: conversationId → array of decrypted messages
//     → Record<string, DecryptedMessage[]> means:
//         {
//           "conv-id-123": [ { id, plaintext, senderId, ... }, ... ],
//           "conv-id-456": [ ... ],
//         }
//     → Empty object {} initially
//
//   activeConversationId: string | null
//     → Which conversation the user currently has open
//     → null when no conversation is selected
//
// ACTIONS:
//   setConversations(conversations: Conversation[]): void
//     → Replaces the whole conversations list
//     → Called when the user searches for someone to chat with
//     → Stub: just set({ conversations })
//
//   setActiveConversation(id: string | null): void
//     → Sets which conversation is currently open
//     → Stub: just set({ activeConversationId: id })
//
//   setHistory(conversationId: string, messages: DecryptedMessage[]): void
//     → Called on Day 8 when loading history from the server
//     → Replaces the messages for one conversation
//     → Stub hint:
//         set((state) => ({
//           messages: { ...state.messages, [conversationId]: messages }
//         }))
//     → The spread + override pattern adds/replaces one key in the Record
//       without touching the others
//
//   addMessage(conversationId: string, message: DecryptedMessage): void
//     → Called by the WebSocket handler (Day 7) when a new message arrives
//     → Appends one message to the conversation's array
//     → Stub hint:
//         set((state) => ({
//           messages: {
//             ...state.messages,
//             [conversationId]: [
//               ...(state.messages[conversationId] ?? []),
//               message
//             ]
//           }
//         }))
//     → The ?? [] handles the case where no messages exist yet for this conversation
//
// ── HOW TO WRITE THE STORE ────────────────────────────────
// Same Zustand pattern as the other stores:
//   export const useChatStore = create<ChatState>()((set) => ({
//     conversations: [],
//     messages: {},
//     activeConversationId: null,
//     setConversations: (conversations) => set({ conversations }),
//     setActiveConversation: (id) => set({ activeConversationId: id }),
//     setHistory: (conversationId, messages) =>
//       set((state) => ({
//         messages: { ...state.messages, [conversationId]: messages },
//       })),
//     addMessage: (conversationId, message) =>
//       set((state) => ({
//         messages: {
//           ...state.messages,
//           [conversationId]: [...(state.messages[conversationId] ?? []), message],
//         },
//       })),
//   }))
//
// ── STUB NOTE ─────────────────────────────────────────────
// On Day 3 the store is enough to prevent TypeScript errors.
// The real work happens on Day 8 when you:
//   → Connect setHistory() to the GET /messages/:convId API call
//   → Connect addMessage() to the WebSocket message:received event
//   → Render the messages in Chat.tsx and MessageBubble.tsx