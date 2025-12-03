import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Video, VideoOff } from "lucide-react";
import { Button } from "./ui/button";

import {
  Holistic,
  HAND_CONNECTIONS,
  POSE_CONNECTIONS,
  Results as HolisticResults,
} from "@mediapipe/holistic";
import { Camera as MediaPipeCamera } from "@mediapipe/camera_utils";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";

interface TranslationModeProps {
  onBack: () => void;
}

interface LandmarkFrame {
  timestamp: number;
  pose: any;
  leftHand: any;
  rightHand: any;
  face?: any;
}

export function TranslationMode({ onBack }: TranslationModeProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [sentence, setSentence] = useState<string[]>([]);
  const [currentPrediction, setCurrentPrediction] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [ naturalText, setNaturalText ] = useState(""); // Para guardar la frase final
  const [ isTranslating, setIsTranslating ] = useState(false); // Para mostrar spinner de carga
  
  // NUEVO: Estado para saber si la cámara está activa
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false); // Para saber si está detectando señas
  const [hasHands, setHasHands] = useState(false); // Nuevo estado para feedback visual

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const holisticRef = useRef<Holistic | null>(null);
  const cameraRef = useRef<MediaPipeCamera | null>(null);

  const frameBufferRef = useRef<LandmarkFrame[]>([]);
  const isCapturingRef = useRef(isCapturing);
  const isDetectingRef = useRef(isDetecting);
  const detectionIntervalRef = useRef<number | null>(null);
  const lastMovementTimeRef = useRef<number>(Date.now());
  const inactivityTimerRef = useRef<number | null>(null);
  const lastLandmarksRef = useRef<any>(null);
  const sentenceRef = useRef<string[]>([]);
  const naturalTextRef = useRef<string>("");
  const lastTranslatedLengthRef = useRef<number>(0); // Para saber si hay nuevas palabras por traducir

  useEffect(() => {
    isCapturingRef.current = isCapturing;
  }, [isCapturing]);

  useEffect(() => {
    isDetectingRef.current = isDetecting;
  }, [isDetecting]);

  useEffect(() => {
    sentenceRef.current = sentence;
  }, [sentence]);

  useEffect(() => {
    naturalTextRef.current = naturalText;
  }, [naturalText]);

  useEffect(() => {
    if (sentence.length > 0) {
      console.log("[LISTA ACUMULADA];", sentence);
      console.log("-------------------------------------------------------")
    }
  }, [sentence]);

  // --- INICIALIZAR MEDIAPIPE ---
  useEffect(() => {
    const holistic = new Holistic({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`,
    });

    holistic.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    holistic.onResults(onResults);
    holisticRef.current = holistic;

    return () => {
      holistic.close();
      if (cameraRef.current) {
        cameraRef.current.stop();
      }
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, []);

  // --- PROCESAR RESULTADOS ---
  const onResults = (results: HolisticResults) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    // FIX: Sincronizar dimensiones del canvas con el video
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    
    if (videoWidth === 0 || videoHeight === 0) return;

    canvas.width = videoWidth;
    canvas.height = videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // FIX: Limpiar completamente y asegurar transparencia
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Dibujar esqueletos (solo landmarks, NO el video)
    if (results.poseLandmarks) {
      drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, {
        color: "#00FF00",
        lineWidth: 2,
      });
      drawLandmarks(ctx, results.poseLandmarks, {
        color: "#FF0000",
        lineWidth: 1,
        radius: 3,
      });
    }

    if (results.leftHandLandmarks) {
      drawConnectors(ctx, results.leftHandLandmarks, HAND_CONNECTIONS, {
        color: "#CC0000",
        lineWidth: 2,
      });
      drawLandmarks(ctx, results.leftHandLandmarks, {
        color: "#00FF00",
        lineWidth: 1,
        radius: 3,
      });
    }

    if (results.rightHandLandmarks) {
      drawConnectors(ctx, results.rightHandLandmarks, HAND_CONNECTIONS, {
        color: "#00CC00",
        lineWidth: 2,
      });
      drawLandmarks(ctx, results.rightHandLandmarks, {
        color: "#FF0000",
        lineWidth: 1,
        radius: 3,
      });
    }

    // Guardar datos si estamos capturando
    if (isCapturingRef.current) {
      const frameData: LandmarkFrame = {
        timestamp: Date.now(),
        pose: results.poseLandmarks,
        leftHand: results.leftHandLandmarks,
        rightHand: results.rightHandLandmarks,
      };
      frameBufferRef.current.push(frameData);
      
      // Log cada 30 frames
      if (frameBufferRef.current.length % 30 === 0) {
        console.log(`Frames capturados: ${frameBufferRef.current.length}`);
      }
    }
    
    // Detectar movimiento comparando con el último frame
    const movementDetected = detectMovement(results);
    const handsVisible = !!(results.rightHandLandmarks || results.leftHandLandmarks);
    setHasHands(handsVisible);
    
    if (movementDetected && isDetectingRef.current) {
      lastMovementTimeRef.current = Date.now();
      
      // Reiniciar el temporizador de inactividad
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    }
    
    lastLandmarksRef.current = results;
  };

  // Función para detectar movimiento significativo
  const detectMovement = (currentResults: HolisticResults): boolean => {
    // Primero verificar que haya manos visibles
    if (!currentResults.rightHandLandmarks && !currentResults.leftHandLandmarks) {
      return false; // No hay manos, no hay movimiento válido
    }
    
    if (!lastLandmarksRef.current) return true;
    
    const prev = lastLandmarksRef.current;
    const curr = currentResults;
    
    // Verificar movimiento en manos (Umbral reducido para mayor sensibilidad)
    if (curr.rightHandLandmarks && prev.rightHandLandmarks) {
      const movement = calculateLandmarkDistance(
        curr.rightHandLandmarks[0],
        prev.rightHandLandmarks[0]
      );
      if (movement > 0.005) return true; // Bajado de 0.02 a 0.005
    }
    
    if (curr.leftHandLandmarks && prev.leftHandLandmarks) {
      const movement = calculateLandmarkDistance(
        curr.leftHandLandmarks[0],
        prev.leftHandLandmarks[0]
      );
      if (movement > 0.005) return true; // Bajado de 0.02 a 0.005
    }
    
    return false;
  };

  const calculateLandmarkDistance = (p1: any, p2: any): number => {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    const dz = p1.z - p2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  };

  // --- FUNCIÓN PARA ENCENDER/APAGAR LA CÁMARA ---
  const toggleCamera = async () => {
    if (isCameraActive) {
      // Apagar cámara
      console.log("Apagando cámara...");
      if (cameraRef.current) {
        cameraRef.current.stop();
        cameraRef.current = null;
      }
      setIsCameraActive(false);
      setIsDetecting(false);
      setIsCapturing(false);
      frameBufferRef.current = [];
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
    } else {
      // Encender cámara
      console.log("Encendiendo cámara...");
      if (videoRef.current && holisticRef.current) {
        try {
          const camera = new MediaPipeCamera(videoRef.current, {
            onFrame: async () => {
              if (videoRef.current && holisticRef.current) {
                await holisticRef.current.send({ image: videoRef.current });
              }
            },
            width: 640,
            height: 480,
          });
          cameraRef.current = camera;
          await camera.start();
          setIsCameraActive(true);
          console.log("Cámara encendida");
        } catch (error) {
          console.error("Error al iniciar cámara:", error);
        }
      }
    }
  };

  // --- FUNCIÓN PARA INICIAR/DETENER DETECCIÓN ---
  const toggleDetection = () => {
    if (isDetecting) {
      // Detener detección
      console.log("Deteniendo detección...");
      setIsDetecting(false);
      setIsCapturing(false);
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
    } else {
      // Iniciar detección con monitoreo de inactividad
      console.log("Iniciando detección inteligente...");
      setIsDetecting(true);
      lastMovementTimeRef.current = Date.now();
      
      // Monitorear inactividad cada 500ms
      detectionIntervalRef.current = window.setInterval(() => {
        if (!isDetectingRef.current) return;
        
        const timeSinceLastMovement = Date.now() - lastMovementTimeRef.current;
        const hasHands = lastLandmarksRef.current?.rightHandLandmarks || lastLandmarksRef.current?.leftHandLandmarks;
        
        // Si hay movimiento (en el último segundo) y manos visibles y no estamos capturando, iniciar captura
        if (timeSinceLastMovement < 1000 && hasHands && !isCapturingRef.current) {
          console.log("Manos detectadas con movimiento, iniciando captura...");
          frameBufferRef.current = [];
          setIsCapturing(true);
          setCurrentPrediction("Capturando...");
        }
        
        // Si no hay manos y estamos capturando, detener captura y procesar si es posible
        if (!hasHands && isCapturingRef.current) {
          console.log("Manos fuera de cuadro...");
          setIsCapturing(false);
          
          // Si tenemos suficientes frames (al menos 15 frames ~ 0.5s), procesamos inmediatamente
          if (frameBufferRef.current.length > 15) {
             console.log("Procesando seña por salida de manos...");
             const framesToProcess = [...frameBufferRef.current];
             processSignLanguage(framesToProcess).then(() => {
                // Resetear tiempo de movimiento para permitir nueva captura inmediata al volver
                lastMovementTimeRef.current = Date.now() - 2000; 
             });
          } else {
             console.log("Descartando captura (muy corta)...");
             setCurrentPrediction("");
          }
          frameBufferRef.current = [];
        }
        
        // Si llevamos 2 segundos capturando, procesar la seña (límite máximo)
        if (isCapturingRef.current && frameBufferRef.current.length >= 60) {
          console.log("Procesando seña capturada (límite de tiempo)...");
          setIsCapturing(false);
          
          const framesToProcess = [...frameBufferRef.current];
          frameBufferRef.current = [];
          
          processSignLanguage(framesToProcess).then(() => {
            // Después de procesar, resetear el tiempo de último movimiento
            lastMovementTimeRef.current = Date.now() - 2000; 
          });
        }
        
        // Si no hay movimiento por 3 segundos y hay NUEVAS palabras, traducir automáticamente y hablar
        if (timeSinceLastMovement > 3000 && !isCapturingRef.current) {
          // Solo traducir si hay palabras y si la cantidad de palabras ha cambiado desde la última traducción
          if (sentenceRef.current.length > 0 && sentenceRef.current.length > lastTranslatedLengthRef.current) {
            console.log("Sin movimiento por 3s y nuevas palabras, traduciendo y hablando...");
            handleTranslate(true); // autoSpeak = true
            // Resetear el temporizador para evitar múltiples traducciones inmediatas
            lastMovementTimeRef.current = Date.now();
          }
        }
      }, 500);
    }
  };

  // --- CONTROL DE CÁMARA (ANTIGUA FUNCIÓN - YA NO SE USA) ---
  const toggleCapture = async () => {
    console.log("=== TOGGLE CAPTURE CALLED ===");
    console.log("isCapturing:", isCapturing);
    console.log("frameBufferRef.current.length:", frameBufferRef.current.length);
    
    // A. DETENER CAPTURA (pero mantener cámara activa)
    if (isCapturing) {
      console.log("DETENIENDO CAPTURA...");
      setIsCapturing(false);

      if (frameBufferRef.current.length > 0) {
        console.log(`Procesando ${frameBufferRef.current.length} frames...`);
        await processSignLanguage(frameBufferRef.current);
      } else {
        console.warn("No se capturaron frames");
      }

      frameBufferRef.current = [];
      return;
    }

    // B. INICIAR CAPTURA
    console.log("INICIANDO CAPTURA...");
    // setSentence([]); Se deben acumular las palabras
    setCurrentPrediction("");
    frameBufferRef.current = [];
    setIsCapturing(true);

    // Solo iniciar cámara si no está activa
    if (videoRef.current && holisticRef.current && !cameraRef.current) {
      try {
        const camera = new MediaPipeCamera(videoRef.current, {
          onFrame: async () => {
            if (videoRef.current && holisticRef.current) {
              await holisticRef.current.send({ image: videoRef.current });
            }
          },
          width: 640,
          height: 480,
        });
        cameraRef.current = camera;

        await camera.start();
        setIsCameraActive(true);
      } catch (error) {
        console.error("Error al iniciar cámara:", error);
      }
    }
  };

  // CONEXION AL BACKEND (CON LOGS)
  const processSignLanguage = async (frames: LandmarkFrame[]) => {
    setIsProcessing(true);
    setCurrentPrediction("Enviando...");


    console.log("[FRONTED] Iniciando proceso de envío...")
    console.log(`[FRONTED] Frames capturados crudos: ${frames.length}`)

    try {
      // Data cleaning
      // Convertimos los datos crudos de Mediapipe al formato exacto que pide schemas.py
      const cleanFrames = frames.map((f) => ({
        timestamp: f.timestamp,
        // Enviar 'null' si no hay deteccion, JSON.stringify elimina 'undefined'
        pose: f.pose || null,
        leftHand: f.leftHand || null,
        rightHand: f.rightHand || null
      }));

      // Creamos el payload final (SignSequence)
      const payload = { frames: cleanFrames };
      console.log("[FRONTED] Enviando payload al backend...")

      // Peticion HTTP (Fetch)
      const response = await fetch("http://localhost:8000/predict-sign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      // Analisis de respuesta
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`)
      }

      const data = await response.json()

      // Impresion por consola (Para validar)
      console.log("[BACKEND] Respuesta recibida:")
      console.table(data);

      console.log("--- DETALLES DE PREDICCION ---");
      console.log(`Prediccion: "${data.prediction}"`)
      console.log(`Confianza: ${(data.confidence * 100).toFixed(2)}%`)

      const word = data.prediction;
      if (word) {
        console.log(`Nueva palabra detectada: ${word}`)
        // Agregamos la palabra a la lista 'sentence'
        setSentence((prev) => [...prev, word]);
        setCurrentPrediction(word);
      } else {
        console.warn("No se detecto ninguna palabra con suficiente confianza.")
        setCurrentPrediction("No detectado")
      }

      if (data.message) {
        console.warn(`Aviso del modelo: ${data.message}`)
      }

      // Actualizar el estado temporal
      setCurrentPrediction("Revisar consola (F12)")

    } catch (error) {
      console.error("[ERROR] Falló la traducción:", error);
      setCurrentPrediction("Error de conexión");
    } finally {
      setIsProcessing(false);
    }
  };

  const fullSentence = sentence.join(" ");

  // FUNCION PARA ENVIAR LA LISTA DE PALABRAS AL BACKEND
  const handleTranslate = async (autoSpeak = false) => {
    if (sentenceRef.current.length == 0) return;
    setIsTranslating(true);
    // No limpiamos naturalText aquí para evitar parpadeos, se actualizará con la respuesta
    
    // Actualizamos la referencia de longitud traducida para evitar re-traducciones innecesarias
    lastTranslatedLengthRef.current = sentenceRef.current.length;

    try {
      console.log("[FRONTED] Enviando lista a refinar:", sentenceRef.current)

      const response = await fetch("http://localhost:8000/refine-text", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ words: sentenceRef.current }),
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`)
      }

      const data = await response.json();
      console.log("[FRONTED] Traduccion recibida a lenguaje natural", data.natural_text);
      setNaturalText(data.natural_text)

      // Reproducir audio automáticamente si se solicita
      if (autoSpeak && data.natural_text) {
        const utterance = new SpeechSynthesisUtterance(data.natural_text);
        utterance.lang = "es-ES";
        window.speechSynthesis.speak(utterance);
      }

    } catch (error) {
      console.error("Error al traducir:", error);
      setNaturalText("Error al conectar con el servidor")

    } finally {
      setIsTranslating(false);
    }
  }

return (
    <div className="flex flex-col h-full bg-[#F2F2F7]">
      {/* Header */}
      <div className="bg-white p-4 shadow-sm flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft />
        </Button>
        <h2 className="font-semibold text-lg">Traductor LSe</h2>
      </div>

      {/* --- VIDEO AREA (Mantenemos tu lógica de fix visual) --- */}
      <div 
        className="relative flex-1 bg-black overflow-hidden"
        style={{ minHeight: "300px" }} 
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
          style={{ transform: "scaleX(-1)", zIndex: 1 }}
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          style={{ transform: "scaleX(-1)", zIndex: 2, backgroundColor: "transparent" }}
        />

        {isCapturing && (
          <div 
            className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm animate-pulse"
            style={{ zIndex: 3 }}
          >
            ● Capturando
          </div>
        )}
        
        {!isCameraActive && (
          <div 
            className="absolute inset-0 flex items-center justify-center text-white/50"
            style={{ zIndex: 0 }}
          >
            <p>Presiona el botón para activar la cámara</p>
          </div>
        )}
      </div>

      {/* --- PANEL DE CONTROL --- */}
      <div className="bg-white p-6 rounded-t-3xl shadow-lg -mt-6 relative z-10 flex flex-col gap-4">
        
        {/* Botones de Control de Cámara y Detección */}
        <div className="flex justify-center gap-4 -mt-12 relative z-50">
          {/* Botón para Encender/Apagar Cámara */}
          <Button
            onClick={toggleCamera}
            className={`h-16 w-16 rounded-full shadow-xl border-4 border-white transition-all duration-300 ${
              isCameraActive
                ? "!bg-green-500 hover:!bg-green-600 text-white"
                : "!bg-gray-600 hover:!bg-gray-700 text-white"
            }`}
            title={isCameraActive ? "Apagar cámara" : "Encender cámara"}
          >
            {isCameraActive ? <Video size={32} /> : <VideoOff size={32} />}
          </Button>

          {/* Botón para Iniciar/Detener Detección */}
          <Button
            onClick={toggleDetection}
            disabled={!isCameraActive}
            className={`h-16 w-16 rounded-full shadow-xl border-4 border-white transition-all duration-300 ${
              isDetecting
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "bg-[#4A90E2] hover:bg-[#3A7BC8] text-white disabled:bg-gray-300 disabled:cursor-not-allowed"
            }`}
            title={isDetecting ? "Detener detección" : "Iniciar detección"}
          >
            {isDetecting ? "⏸" : "▶"}
          </Button>
        </div>

        {/* Estado actual */}
        <div className="text-center space-y-1">
          <p className="text-sm text-gray-600 font-medium">
            {!isCameraActive 
              ? "Enciende la cámara para comenzar" 
              : isDetecting 
                ? (isCapturing 
                    ? "🔴 Capturando seña..." 
                    : hasHands 
                        ? "✋ Manos detectadas - Haz una seña" 
                        : "🔍 Buscando manos...")
                : "Presiona ▶ para iniciar detección automática"
            }
          </p>
          {currentPrediction && (
             <p className="text-xs font-semibold text-[#4A90E2] animate-pulse">
               {currentPrediction}
             </p>
          )}
        </div>

        {/* --- SECCIÓN 1: PALABRAS DETECTADAS (RAW) --- */}
        <div className="space-y-1">
          <div className="flex justify-between items-center px-1">
             <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
               Palabras Detectadas
             </p>
             {sentence.length > 0 && (
               <span className="text-[10px] bg-gray-200 px-2 py-0.5 rounded-full text-gray-600">
                 {sentence.length}
               </span>
             )}
          </div>
          
          <div className="flex flex-wrap gap-2 min-h-[50px] p-3 bg-gray-50 rounded-xl border border-gray-200">
            {sentence.length === 0 ? (
              <span className="text-gray-400 text-sm italic w-full text-center py-2">
                Tus señas aparecerán aquí...
              </span>
            ) : (
              sentence.map((word, idx) => (
                <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full font-medium border border-blue-200 shadow-sm animate-in fade-in zoom-in duration-300">
                  {word}
                </span>
              ))
            )}
          </div>

          <Button 
              className="w-full bg-green-600 hover:bg-green-700 text-black font-semibold shadow-md active:scale-95 transition-all mt-1"
              onClick={ handleTranslate }
              disabled={sentence.length === 0 || isTranslating}
          >
              {isTranslating ? "✨ Procesando...": "✨ Traducir Frase a lenguaje natural"}
          </Button>
        </div>

        {/* --- SECCIÓN 2: TRADUCCIÓN NATURAL (PLACEHOLDER) --- */}
        <div className="space-y-1">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider ml-1">
            Traducción Natural
          </p>
          <div className="bg-white p-3 rounded-xl border border-gray-200 min-h-[60px] flex items-center justify-center bg-gray-50/50">
            <p className={`text-lg font-medium ${naturalText ? "text-gray-800" : "text-gray-400 italic"}`}>
              {/* LÓGICA VISUAL: Mostrar carga, error o texto */}
              {isTranslating 
                ? "Traduciendo..." 
                : naturalText 
                  ? naturalText 
                  : "..."}
            </p>
          </div>
        </div>

        {/* --- BOTONES DE ACCIÓN --- */}
        <div className="grid grid-cols-2 gap-3 mt-1">
           {/* Botón Limpiar */}
           <Button 
             variant="outline" 
             onClick={() =>  {
              setSentence([]);
              setNaturalText(""); // Limpiamos la traduccion
              lastTranslatedLengthRef.current = 0; // Reseteamos el contador
             }}
             disabled={sentence.length === 0}
             className="border-gray-300 text-gray-600 hover:bg-gray-50"
           >
             Limpiar
           </Button>
           
           {/* Botón Escuchar (RESTAURADO) */}
           <Button
             className="bg-[#4A90E2] hover:bg-[#357ABD] text-white"
             onClick={() => {
              console.log(`naturalText: ${naturalText}`)
              const textToSpeak = naturalText || fullSentence
              console.log(`textToSpeak: ${textToSpeak}`)
               const utterance = new SpeechSynthesisUtterance(textToSpeak);
               utterance.lang = "es-ES";
               window.speechSynthesis.speak(utterance);
             }}
             disabled={sentence.length === 0}
           >
             🔊 Escuchar
           </Button>
        </div>

        {/* Botón Traducir (TRIGGER PASO 2) - Ocupa todo el ancho abajo */}
        <Button 
             className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold shadow-md active:scale-95 transition-all mt-1"
             onClick={ handleTranslate }
             disabled={sentence.length === 0 || isTranslating}
        >
            {isTranslating ? "✨ Procesando...": "✨ Traducir Frase"}
        </Button>

      </div>
    </div>
  );
}