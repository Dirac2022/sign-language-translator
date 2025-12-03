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

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const holisticRef = useRef<Holistic | null>(null);
  const cameraRef = useRef<MediaPipeCamera | null>(null);

  const frameBufferRef = useRef<LandmarkFrame[]>([]);
  const isCapturingRef = useRef(isCapturing);

  useEffect(() => {
    isCapturingRef.current = isCapturing;
  }, [isCapturing]);

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
    }
  };

  // --- CONTROL DE CÁMARA ---
  const toggleCapture = async () => {
    // A. DETENER CAPTURA (pero mantener cámara activa)
    if (isCapturing) {
      setIsCapturing(false);

      if (frameBufferRef.current.length > 0) {
        await processSignLanguage(frameBufferRef.current);
      } else {
        console.warn("No se capturaron frames");
      }

      frameBufferRef.current = [];
      return;
    }

    // B. INICIAR CAPTURA
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
  const handleTranslate = async () => {
    if (sentence.length == 0) return;
    setIsTranslating(true);
    setNaturalText(""); // Limpiamos el resultado anterior

    try {
      console.log("[FRONTED] Enviando lista a refinar:", sentence)

      const response = await fetch("http://localhost:8000/refine-text", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ words: sentence }),
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`)
      }

      const data = await response.json();
      console.log("[FRONTED] Traduccion recibida a lenguaje natural", data.natural_text);
      setNaturalText(data.natural_text)

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
        
        {/* Botón Flotante de Cámara */}
        <div className="flex justify-center -mt-12">
          <Button
            onClick={toggleCapture}
            className={`h-16 w-16 rounded-full shadow-xl border-4 border-white ${
              isCapturing
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "bg-[#4A90E2] hover:bg-[#3A7BC8] text-white"
            }`}
          >
            {isCapturing ? <VideoOff size={32} /> : <Video size={32} />}
          </Button>
        </div>

        {/* Estado actual */}
        <div className="text-center space-y-1">
          <p className="text-sm text-gray-400">
            {isCapturing ? "Realiza la seña ahora..." : isProcessing ? "Analizando IA..." : "Presiona para capturar"}
          </p>
          {currentPrediction && isCapturing && (
             <p className="text-xs font-semibold text-[#4A90E2] animate-pulse">
               Detectando...
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