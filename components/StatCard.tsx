import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  color: string;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({ icon: Icon, label, value, color, onClick }) => (
  <div 
    onClick={onClick} 
    className={`bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex items-center justify-between ${onClick ? 'cursor-pointer' : ''}`}
  >
    <div>
      <p className="text-gray-500 text-sm font-medium mb-1">{label}</p>
      <h4 className="text-xl font-bold text-gray-800">{value}</h4>
    </div>
    <div className={`p-3 rounded-lg bg-${color}-100`}>
      <Icon className={`w-6 h-6 text-${color}-600`} />
    </div>
  </div>
);
