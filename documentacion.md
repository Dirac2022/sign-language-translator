## `ProgressDashboards.tsx`

### 1\. Las Importaciones (Herramientas)

Aquí traemos las "piezas de lego" que necesitamos para construir el componente.

```typescript
import { useEffect, useState } from 'react'; // <--- 1. Importamos Hooks
```

  * **`useState`**: Es la "memoria" del componente. Nos permite guardar datos (como los logros o estadísticas) que pueden cambiar con el tiempo.
  * **`useEffect`**: Es un "evento". Nos permite ejecutar código en momentos específicos. Aquí lo usaremos para decir: *"Cuando la pantalla cargue por primera vez, ve a buscar los datos"*.

<!-- end list -->

```typescript
import { Trophy, Flame, Target, Award, Loader2 } from 'lucide-react';
```

  * Importamos iconos SVG bonitos y ligeros. `Loader2` es el círculo que gira mientras carga.

<!-- end list -->

```typescript
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
```

  * Son componentes de interfaz prefabricados (probablemente de *shadcn/ui*). En lugar de escribir 20 líneas de CSS para hacer una tarjeta blanca con sombra, usamos `<Card>`.

-----

### 2\. Las Interfaces (El Contrato de Datos)

Aquí definimos **qué forma tienen los datos**. Esto es TypeScript. Sirve para que tu editor te avise si intentas usar una propiedad que no existe.
**Nota:** Estas interfaces deben ser idénticas a los modelos `SQLModel` de tu Python (`main.py`).

```typescript
interface Achievement {
  id: number;
  name: string;
  icon: string;
  unlocked: boolean; // Coincide con el bool de Python
}

interface UserStats {
  id: number;
  signs_mastered: number;
  streak_days: number;
}

interface WeeklyData {
  labels: string[]; // ['L', 'M', ...]
  data: number[];   // [0, 40, 60, ...]
}
```

-----

### 3\. El Componente y sus Estados (El Cerebro)

Aquí empieza la función principal que dibuja la pantalla.

```typescript
export function ProgressDashboard() {
  // 3. Estados para guardar la data que viene del Backend
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [weeklyData, setWeeklyData] = useState<WeeklyData | null>(null);
  const [loading, setLoading] = useState(true);
```

  * **`stats`**: Empieza como `null` porque al iniciar no sabemos cuántas señas sabe el usuario.
  * **`loading`**: Empieza en `true`. Esto es vital para la Experiencia de Usuario (UX). Mientras sea `true`, mostraremos un spinner de carga.

-----

### 4\. El `useEffect` (La Llamada a la API)

Este bloque es el **puente** entre tu React y tu Python.

```typescript
  // 4. El Efecto: Se ejecuta apenas abres este componente
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Hacemos las 3 peticiones en paralelo
        const [achRes, statsRes, weeklyRes] = await Promise.all([
          fetch('http://localhost:8000/achievements'),
          fetch('http://localhost:8000/stats'),
          fetch('http://localhost:8000/weekly-progress')
        ]);
```

  * **`async / await`**: Permite esperar a que el servidor responda sin congelar la pantalla.
  * **`Promise.all([...])`**: **Técnica Avanzada.** En lugar de pedir los logros, esperar, pedir las stats, esperar... lanza las 3 peticiones **al mismo tiempo**. Esto hace que tu dashboard cargue el triple de rápido.

<!-- end list -->

```typescript
        const achData = await achRes.json();
        const statsData = await statsRes.json();
        const weeklyData = await weeklyRes.json();

        // Guardamos en el estado
        setAchievements(achData);
        setStats(statsData);
        setWeeklyData(weeklyData);
```

  * **`.json()`**: Convierte la respuesta "cruda" del servidor en objetos JavaScript que podemos usar.
  * **`set...`**: Al llamar a estas funciones, React detecta que los datos cambiaron y **vuelve a pintar (re-render)** la pantalla con la información nueva.

<!-- end list -->

```typescript
      } catch (error) {
        console.error("Error conectando con el backend:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []); // <--- El array vacío [] significa "Ejecutar solo una vez al montar"
```

  * **`finally { setLoading(false) }`**: Pase lo que pase (haya éxito o error), al final siempre quitamos el spinner de carga para mostrar el contenido (o el error).

-----

### 5\. Renderizado Condicional (La Pantalla de Carga)

```typescript
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-[#F2F2F7]">
        <Loader2 className="animate-spin text-[#4A90E2]" size={40} />
      </div>
    );
  }
```

  * Si `loading` es true, React detiene todo aquí y solo muestra esto.
  * **CSS:**
      * `flex h-full items-center justify-center`: Centra el icono perfectamente en medio de la pantalla.
      * `animate-spin`: Clase de Tailwind que hace girar el SVG infinitamente.

-----

### 6\. El Renderizado Principal (La Interfaz Real)

Si `loading` es false, llegamos aquí.

```typescript
  return (
    <div className="flex flex-col h-full bg-[#F2F2F7] pb-16 overflow-y-auto">
```

  * **Contenedor Principal:**
      * `flex flex-col`: Organiza los hijos en una columna vertical.
      * `bg-[#F2F2F7]`: Color de fondo gris claro (estilo iOS).
      * `overflow-y-auto`: Si el contenido es muy largo, permite hacer scroll vertical.

#### A. Header (Cabecera)

```typescript
      <div className="bg-gradient-to-br from-[#4A90E2] to-[#50E3C2] px-6 pt-12 pb-8 text-white">
        <h1 className="text-2xl mb-2">Tu Progreso</h1>
        <p className="text-white/80">Sigue mejorando cada día</p>
      </div>
```

  * `bg-gradient-to-br`: Crea ese fondo bonito degradado de Azul (`#4A90E2`) a Turquesa (`#50E3C2`).

#### B. Stats Grid (Tarjetas de Estadísticas)

```typescript
      <div className="px-4 -mt-4 mb-6">
        <div className="grid grid-cols-2 gap-4">
```

  * `-mt-4`: Margen negativo superior. Hace que las tarjetas "suban" un poco y se superpongan al header azul. Efecto visual moderno.
  * `grid grid-cols-2`: Divide el espacio en 2 columnas iguales.

**Tarjeta 1: Señas Dominadas**

```typescript
          <Card className="shadow-md">
            {/* ... Icono Target ... */}
            <CardContent>
              {/* Lógica de Datos */}
              <div className="text-3xl mb-1">{stats?.signs_mastered || 0}</div>
              <p className="text-sm text-[#8E8E93]">Señas Dominadas</p>
            </CardContent>
          </Card>
```

  * **`stats?.signs_mastered || 0`**: Esta línea es vital.
      * `stats?.`: "Si `stats` existe, dame `signs_mastered`". (Optional Chaining).
      * `|| 0`: "Si `stats` es null o undefined (porque falló la carga), muestra un 0". Esto evita que la app se rompa en blanco.

**Tarjeta 2: Racha** (Funciona igual que la anterior, pero con `streak_days`).

#### C. Weekly Progress (El Gráfico de Barras)

Aquí está la lógica visual más compleja que implementamos.

```typescript
      <div className="px-4 mb-6">
        <Card className="shadow-sm">
          {/* ... */}
          <CardContent>
            <div className="flex items-end justify-between gap-2 h-32">
              {weeklyData?.labels.map((day, index) => {
                const height = weeklyData.data[index]; // Valor real de la DB (0 a 100)
                
                // LÓGICA DE FECHA: Calcula qué índice corresponde a "HOY"
                // .getDay() devuelve 0 (Domingo) a 6 (Sábado)
                // Tu array empieza en Lunes. Hacemos un shift matemático.
                const todayIndex = (new Date().getDay() + 6) % 7
                const isToday = index === todayIndex
                
                return (
                  <div key={index} className="flex-1 flex flex-col items-center gap-2">
                    {/* Contenedor de la barra */}
                    <div className="w-full flex items-end justify-center" style={{ height: '100px' }}>
                      <div
                        // Clases dinámicas
                        className={`w-full rounded-t-lg transition-all ${
                          isToday ? 'bg-[#4A90E2]' : 'bg-[#50E3C2]/40'
                        }`}
                        // Altura dinámica basada en datos
                        style={{ height: `${height}%` }}
                      />
                    </div>
                    {/* Etiqueta del día (L, M, X...) */}
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
```

  * **`.map(...)`**: Recorre el array de días (`['L', 'M'...]`) y crea una barra para cada uno.
  * **`isToday ? ... : ...`**: Operador ternario.
      * Si es hoy: La barra es Azul fuerte (`bg-[#4A90E2]`).
      * Si no es hoy: La barra es Turquesa transparente (`bg-[#50E3C2]/40`).
  * **`style={{ height: ... }}`**: Inyecta CSS directamente. Si el backend dice `40`, la barra tendrá `40%` de altura.

#### D. Achievements (Lista de Logros)

```typescript
      <div className="px-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3>Logros Desbloqueados</h3>
          <Badge variant="secondary" className="bg-[#4A90E2]/10 text-[#4A90E2]">
            {/* LÓGICA: Contar cuántos son true */}
            {achievements.filter(a => a.unlocked).length}/{achievements.length}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {achievements.map((achievement) => (
            <Card
              key={achievement.id}
              // LÓGICA VISUAL: Cambia el estilo totalmente si está desbloqueado
              className={`shadow-sm transition-all ${
                achievement.unlocked
                  ? 'bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-200' // Dorado
                  : 'bg-gray-100 opacity-60' // Gris y apagado
              }`}
            >
              <CardContent className="p-4 text-center">
                <div className="text-4xl mb-2">{achievement.icon}</div>
                <p className="text-sm">{achievement.name}</p>
                
                {/* Renderizado Condicional: Solo muestra la medalla si unlocked es true */}
                {achievement.unlocked && (
                  <Award className="text-yellow-500 mx-auto mt-2" size={20} />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
```

  * **`.filter(...).length`**: Una forma elegante de contar en una sola línea cuántos logros tiene el usuario, filtrando el array original.
  * **Clases Condicionales**: Aquí controlamos si la tarjeta se ve "epica" (borde amarillo, fondo naranja) o "bloqueada" (gris, opaca) basándonos en el booleano `unlocked` que viene de la base de datos.

-----

### Resumen del Flujo de Datos

1.  **Carga:** Abres la página -\> `loading = true` -\> Se ve el Spinner.
2.  **Fetch:** `useEffect` dispara 3 peticiones a `localhost:8000`.
3.  **Respuesta:** Python responde con JSONs desde SQLite.
4.  **Actualización:** React guarda esos JSONs en `stats`, `achievements` y `weeklyData`.
5.  **Render:** `loading` cambia a `false`. React dibuja el HTML usando los datos guardados para calcular alturas de barras, colores de logros y números de estadísticas.