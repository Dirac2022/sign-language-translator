import { useEffect, useState } from 'react';
import { Trophy, Flame, Target, Award, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';

// Definicion de las interfaces (Tipos de datos)
// Debe coincidir con lo que envía el backend
interface Achievement {
  id: number;
  name: string;
  icon: string;
  unlocked: boolean;
}

interface UserStats {
  id: number;
  signs_mastered: number;
  streak_days: number;
}

interface WeeklyData {
  labels: string[];
  data: number[];
}

// Funcion principal que dibuja la pantalla
export function ProgressDashboard() {
  // Estados para guardar la data que viene del Backend
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  // stats empieza como null porque al iniciar no sabemos cuantas señas sabe el usuario
  const [stats, setStats] = useState<UserStats | null>(null);
  const [weeklyData, setWeeklyData] = useState<WeeklyData | null>(null);
  // Mientras sea true mostraremos un spinner de carga (UX)
  const [loading, setLoading] = useState(true);

  // Conección con backend (Python)
  // async / await: Permite esperar al que el servidor responda sin congelar la pantalla
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Hacemos las 3 peticiones en paralelo
        const [achRes, statsRes, weeklyRes] = await Promise.all([
          fetch('http://localhost:8000/achievements'),
          fetch('http://localhost:8000/stats'),
          fetch('http://localhost:8000/weekly-progress')
        ]);

        // Guardamos el estado
        const achData = await achRes.json();
        const statsData = await statsRes.json();
        const weeklyData = await weeklyRes.json();

        // Guardamos en el estado para que React los detecte y vuelva a pintar la pantalla con
        // la información nueva
        setAchievements(achData);
        setStats(statsData);
        setWeeklyData(weeklyData);
      } catch (error) {
        console.error("Error conectando con el backend:", error);
      } finally {
        // Haya éxito o error, quitaremos el spinner de carga para mostrar el contenido
        setLoading(false);
      }
    };

    fetchData();
  }, []); // El array vacío [] significa "Ejecutar una sola vez al montar"

  // Estado de carga (Loading)
  if (loading) { 
    return (
      <div className="flex h-full items-center justify-center bg-[#F2F2F7]"> 
        <Loader2 className="animate-spin text-[#4A90E2]" size={40} />
      </div>
    );
  }

  // Renderizado principal (Cuando termine el loading)
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
          
          {/* Señas Dominadas */}
          <Card className="shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="p-2 bg-[#4A90E2]/10 rounded-lg">
                  <Target className="text-[#4A90E2]" size={20} />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Data dinámica*/}
              <div className="text-3xl mb-1">{stats?.signs_mastered || 0}</div>
              <p className="text-sm text-[#8E8E93]">Señas Dominadas</p>
            </CardContent>
          </Card>

          {/* Racha */}
          <Card className="shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="p-2 bg-[#50E3C2]/10 rounded-lg">
                  <Flame className="text-[#50E3C2]" size={20} />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Data dinámica aqui */}
              <div className="text-3xl mb-1">{stats?.streak_days || 0}</div>
              <p className="text-sm text-[#8E8E93]">Días de Racha</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Weekly Progress - 'weeklyData' */}
      <div className="px-4 mb-6">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Progreso Semanal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between gap-2 h-32">
              {weeklyData?.labels.map((day, index) => {
                const height = weeklyData.data[index]; // Valor real de la DB
                // Calcula que indice corresponde a HOY
                // .getDay() devuelve de 0 (Domingo) a 6 (Sabado)
                const todayIndex = (new Date().getDay() + 6) % 7
                const isToday = index === todayIndex
                
                return (
                  <div key={index} className="flex-1 flex flex-col items-center gap-2">
                    { /* Contenedor de la barra */}
                    <div className="w-full flex items-end justify-center" style={{ height: '100px' }}>
                      <div
                        // Si es HOY, la barra es azul fuerte bg-[#4A90E2]
                        // Sino, es turquesa bg-[#50E3C2]/40
                        className={`w-full rounded-t-lg transition-all ${
                          isToday ? 'bg-[#4A90E2]' : 'bg-[#50E3C2]/40'
                        }`}
                        style={{ height: `${height}%` }}
                      />
                    </div>
                    { /* Etiqueta del dia (color azul/gris) */}
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

      {/* Achievements - 'achievements' */}
      <div className="px-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3>Logros Desbloqueados</h3>
          <Badge variant="secondary" className="bg-[#4A90E2]/10 text-[#4A90E2]">
            {/* Calculamos cuantos unlocked hay. Ejemplo 1/4 */}
            {achievements.filter(a => a.unlocked).length}/{achievements.length}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {achievements.map((achievement) => (
            <Card
              key={achievement.id}
              // Cambia el estilo si esta desbloqueado
              className={`shadow-sm transition-all ${
                achievement.unlocked
                  ? 'bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-200'
                  : 'bg-gray-100 opacity-60'
              }`}
            >
              <CardContent className="p-4 text-center">
                <div className="text-4xl mb-2">{achievement.icon}</div>
                <p className="text-sm">{achievement.name}</p>
                { /* Renderizado condicional: Solo muestra la medalla si unlocked es true*/}
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
              Estás construyendo un gran hábito de aprendizaje.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}