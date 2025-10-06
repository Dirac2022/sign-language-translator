import { Camera, BookOpen } from 'lucide-react';
import { Button } from './ui/button';

interface HomePageProps {
  onNavigate: (tab: 'translate' | 'practice') => void;
}

export function HomePage({ onNavigate }: HomePageProps) {
  return (
    <div className="flex flex-col h-full bg-[#F2F2F7] pb-16">
      {/* Header */}
      <div className="bg-white px-6 pt-12 pb-6 shadow-sm">
        <h1 className="text-2xl mb-2">Hola 👋</h1>
        <p className="text-[#8E8E93]">Bienvenido a ConnectSigns</p>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-6 py-8 flex flex-col justify-center gap-6">
        {/* Translate Button */}
        <Button
          onClick={() => onNavigate('translate')}
          className="h-auto py-8 px-6 bg-[#4A90E2] hover:bg-[#3A7BC8] text-white rounded-2xl shadow-lg flex flex-col items-center gap-4 transition-all active:scale-95"
        >
          <div className="bg-white/20 p-4 rounded-full">
            <Camera size={40} strokeWidth={2} />
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-xl">Traducir Ahora</span>
            <span className="text-sm text-white/80">
              Comunicación en tiempo real
            </span>
          </div>
        </Button>

        {/* Practice Button */}
        <Button
          onClick={() => onNavigate('practice')}
          className="h-auto py-8 px-6 bg-[#50E3C2] hover:bg-[#40D3B2] text-white rounded-2xl shadow-lg flex flex-col items-center gap-4 transition-all active:scale-95"
        >
          <div className="bg-white/20 p-4 rounded-full">
            <BookOpen size={40} strokeWidth={2} />
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-xl">Aprender y Practicar</span>
            <span className="text-sm text-white/80">
              Mejora tus habilidades
            </span>
          </div>
        </Button>
      </div>

      {/* Info Section */}
      <div className="px-6 pb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-center text-sm text-[#8E8E93]">
            ConnectSigns rompe las barreras de comunicación entre personas
            sordas y oyentes
          </p>
        </div>
      </div>
    </div>
  );
}
