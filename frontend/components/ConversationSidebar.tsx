'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, MessageSquare, Search, User, Globe } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getApiBaseUrl } from '@/lib/api';
import DomainSelector from './DomainSelector';

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
  websiteId?: number | null;
  websiteName?: string | null;
  domain?: string | null;
}

interface ConversationSidebarProps {
  apiUrl?: string;
  onSelectConversation: (sessionId: string) => void;
  selectedSessionId?: string;
}

export default function ConversationSidebar({ apiUrl, onSelectConversation, selectedSessionId }: ConversationSidebarProps) {
  const baseUrl = apiUrl ?? getApiBaseUrl();
  const { user, isAdmin, isManager, selectedDomainId } = useAuth();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredConversations, setFilteredConversations] = useState<ConversationSummary[]>([]);

  const loadConversations = useCallback(async () => {
    try {
      setLoading(true);

      // Build query params - use selectedDomainId from context
      const params = new URLSearchParams({ limit: '100' });
      if (selectedDomainId) {
        params.append('websiteId', selectedDomainId.toString());
      }

      const token = localStorage.getItem('auth_token');
      const headers: HeadersInit = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`${baseUrl}/conversations?${params}`, { headers });
      if (!response.ok) throw new Error('Failed to load conversations');

      const data = await response.json();
      setConversations(data);
      setFilteredConversations(data);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  }, [baseUrl, selectedDomainId]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (searchTerm.trim()) {
      // Filter locally for now (could also use API search)
      const filtered = conversations.filter(
        (conv) =>
          conv.firstMessage?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          conv.lastMessage?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          conv.sessionId.toLowerCase().includes(searchTerm.toLowerCase()),
      );
      setFilteredConversations(filtered);
    } else {
      setFilteredConversations(conversations);
    }
  }, [searchTerm, conversations]);

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
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-gray-900 uppercase tracking-wide">Conversations</h2>
          <button
            onClick={loadConversations}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        {/* Domain Selector */}
        <div className="mb-3">
          <DomainSelector />
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-sm text-gray-600">Loading...</div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-600">{searchTerm ? 'No conversations found' : 'No conversations yet'}</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredConversations.map((conv) => (
              <div
                key={conv.sessionId}
                onClick={() => onSelectConversation(conv.sessionId)}
                className={`
                  p-3 cursor-pointer transition-colors hover:bg-gray-50
                  ${selectedSessionId === conv.sessionId ? 'bg-blue-50 border-l-2 border-blue-500' : ''}
                `}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide font-semibold">{formatDate(conv.updatedAt)}</div>
                    <div className="text-sm font-semibold text-gray-900 truncate leading-snug">{truncate(conv.firstMessage, 35)}</div>
                  </div>
                </div>

                {/* Domain Badge */}
                {conv.domain && (
                  <div className="mb-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-indigo-100 text-indigo-800 rounded">
                      <Globe className="w-3 h-3" />
                      {conv.domain}
                    </span>
                  </div>
                )}

                {/* Metadata */}
                <div className="flex items-center gap-3 text-xs text-gray-600 mt-2">
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-4 h-4" />
                    {conv.messageCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <Search className="w-4 h-4" />
                    {conv.traceCount}
                  </span>
                  {conv.userId && (
                    <span className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      {conv.userId.substring(0, 6)}
                    </span>
                  )}
                </div>

                {/* Tags */}
                {conv.tags && conv.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {conv.tags.slice(0, 2).map((tag, idx) => (
                      <span key={idx} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded font-medium">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Model */}
                {conv.modelUsed && <div className="text-xs text-gray-500 mt-2 truncate font-medium">{conv.modelUsed}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
