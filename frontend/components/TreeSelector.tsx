'use client'

import { useState } from 'react'
import { Plus, Trash2, CheckCircle2, Clock } from 'lucide-react'
import { DialogTree } from '@/lib/api'

interface TreeSelectorProps {
  trees: DialogTree[]
  selectedTree: DialogTree | null
  onSelect: (tree: DialogTree) => void
  onCreate: () => void
  onDelete: (id: number) => void
  loading: boolean
}

export default function TreeSelector({
  trees,
  selectedTree,
  onSelect,
  onCreate,
  onDelete,
  loading,
}: TreeSelectorProps) {
  return (
    <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dialog Trees</h2>
          <p className="text-sm text-gray-500 mt-1">Manage your conversation trees</p>
        </div>
        <button
          onClick={onCreate}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl hover:from-primary-700 hover:to-primary-800 font-semibold shadow-medium hover:shadow-large transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          <Plus className="w-5 h-5" />
          New Tree
        </button>
      </div>

      {trees.length === 0 ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl mb-4 shadow-soft">
            <Plus className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-600 font-semibold mb-1">No trees yet</p>
          <p className="text-gray-400 text-sm">Create your first dialog tree to get started!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {trees.map((tree) => (
            <div
              key={tree.id}
              className={`group relative p-5 rounded-xl border-2 transition-all cursor-pointer ${
                selectedTree?.id === tree.id
                  ? 'bg-gradient-to-br from-primary-50 to-primary-100 border-primary-300 shadow-medium'
                  : 'bg-white border-gray-200 hover:border-primary-300 hover:shadow-soft'
              }`}
              onClick={() => onSelect(tree)}
            >
              {selectedTree?.id === tree.id && (
                <div className="absolute top-3 right-3">
                  <div className="p-1.5 bg-primary-600 rounded-full">
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  </div>
                </div>
              )}
              
              <div className="pr-8">
                <h3 className="font-bold text-gray-900 text-lg mb-2 group-hover:text-primary-700 transition-colors">
                  {tree.name}
                </h3>
                {tree.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{tree.description}</p>
                )}
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Updated {new Date(tree.updated_at).toLocaleDateString()}</span>
                </div>
              </div>
              
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(tree.id)
                }}
                className="absolute bottom-3 right-3 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                title="Delete tree"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
