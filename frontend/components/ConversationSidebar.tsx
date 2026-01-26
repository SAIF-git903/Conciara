'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, MessageSquare, Search, User } from 'lucide-react';

export interface ConversationSummary {
  sessionId: string;
  treeId: number;
  userId: string | null;
  firstMessage: string | null;
  lastMessage: string | null;
  messageCount: number;
  createdAt: Date;
  updatedAt: Date;
  traceCount: number;
  tags?: string[];
  modelUsed?: string;
}

interface ConversationSidebarProps {
  apiUrl?: string;
  onSelectConversation: (sessionId: string) => void;
  selectedSessionId?: string;
}

export default function ConversationSidebar({
  apiUrl = 'http://localhost:3001/api',
  onSelectConversation,
  selectedSessionId,
}: ConversationSidebarProps) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredConversations, setFilteredConversations] = useState<ConversationSummary[]>([]);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (searchTerm.trim()) {
      // Filter locally for now (could also use API search)
      const filtered = conversations.filter(
        (conv) =>
          conv.firstMessage?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          conv.lastMessage?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          conv.sessionId.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredConversations(filtered);
    } else {
      setFilteredConversations(conversations);
    }
  }, [searchTerm, conversations]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const isLocalhost = typeof window !== 'undefined' && 
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      const baseUrl = isLocalhost ? apiUrl : '/api/proxy';
      
      const response = await fetch(`${baseUrl}/conversations?limit=100`);
      if (!response.ok) throw new Error('Failed to load conversations');
      
      const data = await response.json();
      setConversations(data);
      setFilteredConversations(data);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return d.toLocaleDateString();
  };

  const truncate = (text: string | null, maxLength: number = 50) => {
    if (!text) return 'No message';
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  return (
    <div className="w-72 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Conversations</h2>
          <button
            onClick={loadConversations}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-2.5 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-3 text-center text-xs text-gray-500">Loading...</div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-3 text-center text-xs text-gray-500">
            {searchTerm ? 'No conversations found' : 'No conversations yet'}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredConversations.map((conv) => (
              <div
                key={conv.sessionId}
                onClick={() => onSelectConversation(conv.sessionId)}
                className={`
                  p-2.5 cursor-pointer transition-colors hover:bg-gray-50
                  ${selectedSessionId === conv.sessionId ? 'bg-blue-50 border-l-2 border-blue-500' : ''}
                `}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-1.5">
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] text-gray-400 mb-0.5 uppercase tracking-wide">
                      {formatDate(conv.updatedAt)}
                    </div>
                    <div className="text-xs font-medium text-gray-900 truncate leading-tight">
                      {truncate(conv.firstMessage, 35)}
                    </div>
                  </div>
                </div>

                {/* Metadata */}
                <div className="flex items-center gap-2 text-[10px] text-gray-500 mt-1.5">
                  <span className="flex items-center gap-0.5">
                    <MessageSquare className="w-3 h-3" />
                    {conv.messageCount}
                  </span>
                  <span className="flex items-center gap-0.5">
                    <Search className="w-3 h-3" />
                    {conv.traceCount}
                  </span>
                  {conv.userId && (
                    <span className="flex items-center gap-0.5">
                      <User className="w-3 h-3" />
                      {conv.userId.substring(0, 6)}
                    </span>
                  )}
                </div>

                {/* Tags */}
                {conv.tags && conv.tags.length > 0 && (
                  <div className="flex flex-wrap gap-0.5 mt-1.5">
                    {conv.tags.slice(0, 2).map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-1.5 py-0.5 text-[10px] bg-gray-100 text-gray-600 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Model */}
                {conv.modelUsed && (
                  <div className="text-[10px] text-gray-400 mt-1 truncate">
                    {conv.modelUsed}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
