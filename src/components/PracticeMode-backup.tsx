import { useState } from 'react';
import { ArrowLeft, Camera, CheckCircle2, XCircle, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import { Progress } from './ui/progress';

interface PracticeModeProps {
  onBack: () => void;
}

const lessons = [
  { id: 1, phrase: 'Hola, ¿cómo estás?', difficulty: 'easy' },
  { id: 2, phrase: 'Buenos días', difficulty: 'easy' },
  { id: 3, phrase: 'Gracias por tu ayuda', difficulty: 'medium' },
  { id: 4, phrase: '¿Dónde está el baño?', difficulty: 'medium' },
  { id: 5, phrase: 'Me gustaría aprender más', difficulty: 'hard' },
];

export function PracticeMode({ onBack }: PracticeModeProps) {
  const [currentLesson, setCurrentLesson] = useState(0);
  const [isPracticing, setIsPracticing] = useState(false);
  const [feedback, setFeedback] = useState<'correct' | 'almost' | 'incorrect' | null>(null);
  const [showDemo, setShowDemo] = useState(false);

  const lesson = lessons[currentLesson];
  const progress = ((currentLesson + 1) / lessons.length) * 100;

  const handleStartPractice = () => {
    setIsPracticing(true);
    setFeedback(null);
    
    // Simular reconocimiento de señas
    setTimeout(() => {
      const outcomes = ['correct', 'almost', 'incorrect'] as const;
      const randomOutcome = outcomes[Math.floor(Math.random() * outcomes.length)];
      setFeedback(randomOutcome);
      setIsPracticing(false);
    }, 3000);
  };

  const handleNext = () => {
    if (currentLesson < lessons.length - 1) {
      setCurrentLesson(currentLesson + 1);
      setFeedback(null);
    }
  };

  const handleShowDemo = () => {
    setShowDemo(true);
    setTimeout(() => setShowDemo(false), 3000);
  };

  return (
    <div className="flex flex-col h-full bg-white pb-16">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 pt-12 pb-4">
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="rounded-full"
            aria-label="Volver"
          >
            <ArrowLeft size={24} />
          </Button>
          <h2>Modo Práctica</h2>
        </div>
        
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-[#8E8E93]">
            <span>Lección {currentLesson + 1} de {lessons.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      {/* Challenge Card */}
      <div className="px-4 py-6 bg-[#F2F2F7]">
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="text-center space-y-4">
            <div className="inline-block px-4 py-1 bg-[#4A90E2]/10 text-[#4A90E2] rounded-full text-sm">
              {lesson.difficulty === 'easy' && 'Fácil'}
              {lesson.difficulty === 'medium' && 'Medio'}
              {lesson.difficulty === 'hard' && 'Difícil'}
            </div>
            
            <h3 className="text-2xl">"{lesson.phrase}"</h3>
            
            <Button
              variant="outline"
              onClick={handleShowDemo}
              className="border-2 border-[#4A90E2] text-[#4A90E2] hover:bg-[#4A90E2] hover:text-white"
            >
              Ver demostración
            </Button>

            {/* Demo Avatar */}
            {showDemo && (
              <div className="mt-4 p-6 bg-[#4A90E2]/10 rounded-xl">
                <div className="text-6xl mb-2">🤟</div>
                <p className="text-sm text-[#8E8E93]">Avatar demostrando la seña...</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Camera View */}
      <div className="relative bg-[#F2F2F7] aspect-video mx-4 rounded-xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
          <Camera size={40} className="text-white/30" />
        </div>
        
        {isPracticing && (
          <div className="absolute inset-0 border-4 border-[#50E3C2] animate-pulse" />
        )}
      </div>

      {/* Feedback Area */}
      <div className="flex-1 px-4 py-6">
        {!feedback && !isPracticing && (
          <Button
            onClick={handleStartPractice}
            className="w-full py-6 bg-[#50E3C2] hover:bg-[#40D3B2] text-white rounded-xl flex items-center justify-center gap-3"
          >
            <Camera size={24} />
            Comenzar Práctica
          </Button>
        )}

        {isPracticing && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-[#4A90E2] rounded-full mx-auto mb-4 animate-pulse" />
            <p className="text-[#8E8E93]">Analizando tus señas...</p>
          </div>
        )}

        {feedback && (
          <div className="space-y-4">
            <div
              className={`p-6 rounded-2xl text-center ${
                feedback === 'correct'
                  ? 'bg-[#50E3C2]/10'
                  : feedback === 'almost'
                  ? 'bg-yellow-100'
                  : 'bg-red-100'
              }`}
            >
              {feedback === 'correct' && (
                <>
                  <CheckCircle2 size={48} className="text-[#50E3C2] mx-auto mb-3" />
                  <h3 className="text-xl text-[#50E3C2] mb-2">¡Correcto!</h3>
                  <p className="text-[#8E8E93]">Excelente trabajo. Señas perfectas.</p>
                </>
              )}
              
              {feedback === 'almost' && (
                <>
                  <div className="text-5xl mb-3">⚠️</div>
                  <h3 className="text-xl text-yellow-600 mb-2">¡Casi!</h3>
                  <p className="text-[#8E8E93]">
                    Intenta mover el pulgar un poco más hacia arriba
                  </p>
                </>
              )}
              
              {feedback === 'incorrect' && (
                <>
                  <XCircle size={48} className="text-[#D0021B] mx-auto mb-3" />
                  <h3 className="text-xl text-[#D0021B] mb-2">Inténtalo de nuevo</h3>
                  <p className="text-[#8E8E93]">
                    Revisa la demostración y vuelve a intentarlo
                  </p>
                </>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleStartPractice}
                className="flex-1 py-4 border-2"
              >
                Reintentar
              </Button>
              
              <Button
                onClick={handleNext}
                disabled={currentLesson === lessons.length - 1}
                className="flex-1 py-4 bg-[#4A90E2] hover:bg-[#3A7BC8] text-white flex items-center justify-center gap-2"
              >
                Siguiente
                <ChevronRight size={20} />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
