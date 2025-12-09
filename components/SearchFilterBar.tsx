
import React from 'react';
import { Search, Filter } from 'lucide-react';

interface SearchFilterBarProps {
  onSearch: (term: string) => void;
  onFilterChange?: (filter: string) => void;
  filterOptions?: { label: string; value: string }[];
  placeholder?: string;
  className?: string;
  value?: string;
}

export const SearchFilterBar: React.FC<SearchFilterBarProps> = ({
  onSearch,
  onFilterChange,
  filterOptions = [],
  placeholder = "Search...",
  className = "",
  value
}) => {
  return (
    <div className={`flex flex-col sm:flex-row gap-3 mb-6 ${className}`}>
      <div className="relative flex-1 group">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-indigo-500 transition-colors" />
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm transition-all"
        />
      </div>
      {filterOptions.length > 0 && onFilterChange && (
        <div className="relative min-w-[180px]">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
            <select
              onChange={(e) => onFilterChange(e.target.value)}
              className="w-full pl-10 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm appearance-none cursor-pointer text-gray-700 font-medium hover:border-gray-300 transition-colors"
            >
              <option value="">All</option>
              {filterOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
        </div>
      )}
    </div>
  );
};
