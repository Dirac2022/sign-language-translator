import { Home, Camera, BookOpen, TrendingUp } from 'lucide-react';

interface BottomTabBarProps {
  activeTab: 'home' | 'translate' | 'practice' | 'progress';
  onTabChange: (tab: 'home' | 'translate' | 'practice' | 'progress') => void;
}

export function BottomTabBar({ activeTab, onTabChange }: BottomTabBarProps) {
  const tabs = [
    { id: 'home' as const, icon: Home, label: 'Inicio' },
    { id: 'translate' as const, icon: Camera, label: 'Traducir' },
    { id: 'practice' as const, icon: BookOpen, label: 'Practicar' },
    { id: 'progress' as const, icon: TrendingUp, label: 'Progreso' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-md mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors"
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon
                size={24}
                className={isActive ? 'text-[#4A90E2]' : 'text-[#8E8E93]'}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span
                className={`text-xs ${
                  isActive ? 'text-[#4A90E2]' : 'text-[#8E8E93]'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
