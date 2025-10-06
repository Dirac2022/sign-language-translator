import { Trophy, Flame, Target, Award } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';

export function ProgressDashboard() {
  const achievements = [
    { id: 1, name: 'Maestro del Saludo', icon: '👋', unlocked: true },
    { id: 2, name: 'Experto en Preguntas', icon: '❓', unlocked: true },
    { id: 3, name: 'Conversador', icon: '💬', unlocked: false },
    { id: 4, name: 'Políglota de Señas', icon: '🌍', unlocked: false },
  ];

  return (
    <div className="flex flex-col h-full bg-[#F2F2F7] pb-16 overflow-y-auto">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#4A90E2] to-[#50E3C2] px-6 pt-12 pb-8 text-white">
        <h1 className="text-2xl mb-2">Tu Progreso</h1>
        <p className="text-white/80">Sigue mejorando cada día</p>
      </div>

      {/* Stats Grid */}
      <div className="px-4 -mt-4 mb-6">
        <div className="grid grid-cols-2 gap-4">
          {/* Signs Mastered */}
          <Card className="shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="p-2 bg-[#4A90E2]/10 rounded-lg">
                  <Target className="text-[#4A90E2]" size={20} />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl mb-1">47</div>
              <p className="text-sm text-[#8E8E93]">Señas Dominadas</p>
            </CardContent>
          </Card>

          {/* Practice Streak */}
          <Card className="shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="p-2 bg-[#50E3C2]/10 rounded-lg">
                  <Flame className="text-[#50E3C2]" size={20} />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl mb-1">12</div>
              <p className="text-sm text-[#8E8E93]">Días de Racha</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Weekly Progress */}
      <div className="px-4 mb-6">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Progreso Semanal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between gap-2 h-32">
              {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day, index) => {
                const heights = [60, 80, 45, 90, 70, 30, 85];
                const isToday = index === 5; // Sábado
                
                return (
                  <div key={day} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full flex items-end justify-center" style={{ height: '100px' }}>
                      <div
                        className={`w-full rounded-t-lg transition-all ${
                          isToday ? 'bg-[#4A90E2]' : 'bg-[#50E3C2]/40'
                        }`}
                        style={{ height: `${heights[index]}%` }}
                      />
                    </div>
                    <span className={`text-xs ${isToday ? 'text-[#4A90E2]' : 'text-[#8E8E93]'}`}>
                      {day}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Achievements */}
      <div className="px-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3>Logros Desbloqueados</h3>
          <Badge variant="secondary" className="bg-[#4A90E2]/10 text-[#4A90E2]">
            2/4
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {achievements.map((achievement) => (
            <Card
              key={achievement.id}
              className={`shadow-sm transition-all ${
                achievement.unlocked
                  ? 'bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-200'
                  : 'bg-gray-100 opacity-60'
              }`}
            >
              <CardContent className="p-4 text-center">
                <div className="text-4xl mb-2">{achievement.icon}</div>
                <p className="text-sm">{achievement.name}</p>
                {achievement.unlocked && (
                  <Award className="text-yellow-500 mx-auto mt-2" size={20} />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Motivational Section */}
      <div className="px-4 pb-6">
        <Card className="shadow-sm bg-gradient-to-br from-[#4A90E2] to-[#50E3C2] text-white border-0">
          <CardContent className="p-6 text-center">
            <Trophy size={40} className="mx-auto mb-3" />
            <h3 className="text-xl mb-2">¡Sigue así!</h3>
            <p className="text-white/90">
              Estás a 3 señas de desbloquear el logro "Conversador"
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
