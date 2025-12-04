import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Video, VideoOff, CheckCircle2, XCircle, Camera, RotateCcw } from "lucide-react";
import { Button } from "./ui/button";
import AvatarAnimationPlayer from "./avatar/AvatarAnimationPlayer";

import {
  Holistic,
  HAND_CONNECTIONS,
  POSE_CONNECTIONS,
  Results as HolisticResults,
} from "@mediapipe/holistic";
import { Camera as MediaPipeCamera } from "@mediapipe/camera_utils";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";

interface PracticeModeProps {
  onBack: () => void;
}

interface LandmarkFrame {
  timestamp: number;
  pose: any;
  leftHand: any;
  rightHand: any;
  face?: any;
}

const SIGNS = [
  "hola", "gracias", "comer", "ayuda", "adios", "baño", "beber", "casa",
  "dolor", "donde", "espera", "ir", "porfavor", "querer", "tu", "venir", "yo",
];

export function PracticeMode({ onBack }: PracticeModeProps) {
  const [selectedSign, setSelectedSign] = useState("hola");
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<boolean | null>(null);
  const [avatarKey, setAvatarKey] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const holisticRef = useRef<Holistic | null>(null);
  const cameraRef = useRef<MediaPipeCamera | null>(null);

  const frameBufferRef = useRef<LandmarkFrame[]>([]);
  const isRecordingRef = useRef(isRecording);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

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

  // --- PROCESAMIENTO DE FRAMES ---
  const onResults = (results: HolisticResults) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;

    if (videoWidth === 0 || videoHeight === 0) return;

    canvas.width = videoWidth;
    canvas.height = videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

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

    if (isRecordingRef.current) {
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
  const toggleCamera = async () => {
    if (isCameraOn) {
      setIsCameraOn(false);
      setIsRecording(false);
      if (cameraRef.current) {
        cameraRef.current.stop();
        cameraRef.current = null;
      }
    } else {
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
          setIsCameraOn(true);
        } catch (error) {
          console.error("Error al iniciar cámara:", error);
        }
      }
    }
  };

  // --- VALIDACIÓN DE SEÑA ---
// --- VALIDACIÓN DE SEÑA (CON ACTUALIZACIÓN DE DASHBOARD) ---
  const handleValidate = async () => {
    setIsRecording(false);

    if (frameBufferRef.current.length === 0) {
      console.warn("⚠️ No se capturaron frames.");
      return;
    }

    setIsValidating(true);
    setValidationResult(null);

    console.log(
      `🚀 Enviando ${frameBufferRef.current.length} frames al backend...`
    );

    try {
      const cleanFrames = frameBufferRef.current.map((f) => ({
        timestamp: f.timestamp,
        pose: f.pose || null,
        leftHand: f.leftHand || null,
        rightHand: f.rightHand || null,
      }));

      // 1. Obtener predicción
      const response = await fetch("http://localhost:8000/predict-sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frames: cleanFrames }),
      });

      if (!response.ok) throw new Error("Error en backend");

      const data = await response.json();
      const predictedWord = data.prediction?.toLowerCase();
      const targetWord = selectedSign.toLowerCase();

      console.log(`🤖 Predicción: "${predictedWord}" | 🎯 Objetivo: "${targetWord}"`);

      // Calculamos si es correcto
      const isCorrect = predictedWord === targetWord;
      setValidationResult(isCorrect);

      // ---------------------------------------------------------
      // PASO 4: ACTUALIZAR DASHBOARD (Solo si es correcto)
      // ---------------------------------------------------------
      if (isCorrect) {
        console.log("¡CORRECTO! Actualizando puntaje en la base de datos...");
        
        try {
          const updateRes = await fetch("http://localhost:8000/update-progress", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          });

          if (updateRes.ok) {
            const updateData = await updateRes.json();
            console.log("📈 Dashboard actualizado con éxito:", updateData);
            console.log(`✨ Nuevo puntaje diario: ${updateData.new_score}`);
          } else {
            console.error("❌ Error al actualizar el dashboard (Backend falló).");
          }
        } catch (updateError) {
          console.error("❌ Error de conexión al actualizar dashboard:", updateError);
        }
      }
      // ---------------------------------------------------------

    } catch (error) {
      console.error("Error validando:", error);
      setValidationResult(false);
    } finally {
      setIsValidating(false);
      frameBufferRef.current = [];
    }
  };

  const toggleRecording = () => {
    if (!isCameraOn) return;

    if (isRecording) {
      handleValidate();
    } else {
      setValidationResult(null);
      frameBufferRef.current = [];
      setIsRecording(true);
    }
  };

  const selectSign = (sign: string) => {
    setSelectedSign(sign);
    setValidationResult(null);
    setAvatarKey(prev => prev + 1);
  };

  const replayAvatar = () => {
    setAvatarKey(prev => prev + 1);
  };

  // --- RENDER FEEDBACK ---
  const renderFeedback = () => {
    if (isValidating) {
      return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", color: "#888" }}>
          <div style={{
            width: "20px",
            height: "20px",
            border: "2px solid #888",
            borderTopColor: "transparent",
            borderRadius: "50%",
            animation: "spin 1s linear infinite"
          }} />
          <span style={{ fontWeight: 500 }}>Validando tu seña...</span>
        </div>
      );
    }

    if (validationResult === true) {
      return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px" }}>
          <CheckCircle2 style={{ width: "32px", height: "32px", color: "#22c55e" }} />
          <span style={{ fontWeight: 700, fontSize: "1.25rem", color: "#22c55e" }}>¡Correcto!</span>
        </div>
      );
    }

    if (validationResult === false) {
      return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", color: "#ef4444" }}>
          <XCircle style={{ width: "32px", height: "32px" }} />
          <span style={{ fontWeight: 700, fontSize: "1.25rem" }}>Incorrecto, intenta de nuevo</span>
        </div>
      );
    }

    if (isRecording) {
      return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", color: "#ef4444" }}>
          <div style={{
            width: "12px",
            height: "12px",
            backgroundColor: "#ef4444",
            borderRadius: "50%",
            animation: "pulse 1s ease-in-out infinite"
          }} />
          <span style={{ fontWeight: 500 }}>Capturando tu seña...</span>
        </div>
      );
    }

    if (!isCameraOn) {
      return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", color: "#000" }}>
          <VideoOff style={{ width: "24px", height: "24px" }} />
          <span style={{ fontWeight: 500 }}>Enciende la cámara para comenzar</span>
        </div>
      );
    }

    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", color: "#3b82f6" }}>
        <Camera style={{ width: "24px", height: "24px" }} />
        <span style={{ fontWeight: 500 }}>Cámara lista. Presiona "Intentar Seña"</span>
      </div>
    );
  };


  const updateUserProgress = async () => {
    try {
      console.log("Actualizando progreso en el backend...")
      const response = await fetch("http://localhost:8000/update-progress", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
      });
  
      if (!response.ok) throw new Error("Error actualizando progreso");
  
      const data = await response.json();
      console.log("Progreso actualizado:", data);
      // Ejemplo: data: { status: "success", new_score: 10, total_mastered: 48 }
  
    } catch (error) {
      console.error("Error al actualizar dashboard:", error)
    }
  }

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100vh",
      width: "100vw",
      backgroundColor: "#F2F2F7",
      overflow: "hidden"
    }}>
      {/* CSS para animaciones */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>

      {/* ========== HEADER ========== */}
      <div style={{
        backgroundColor: "#F2F2F7",
        padding: "12px 16px",
        borderBottom: "1px solid #F2F2F7",
        flexShrink: 0
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onBack}
            style={{ color: "white" }}
          >
            <ArrowLeft />
          </Button>
          <div>
            <h2 style={{ fontWeight: 600, fontSize: "1.125rem", color: "black", margin: 0 }}>
              Modo Práctica
            </h2>
            <p style={{ color: "#3c506dff", fontSize: "0.875rem", margin: 0 }}>
              Selecciona una seña y practica
            </p>
          </div>
        </div>
      </div>

      {/* ========== CONTENIDO PRINCIPAL - DOS COLUMNAS ========== */}
      <div style={{
        flex: 1,
        display: "flex",
        overflow: "hidden",
        paddingBottom: "70px"
      }}>
        
        {/* ====== COLUMNA IZQUIERDA: AVATAR + BOTONES ====== */}
        <div style={{
          width: "50%",
          display: "flex",
          flexDirection: "column",
          //borderRight: "1px solid #334155"
        }}>
          
          {/* Header de la seña seleccionada */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            backgroundColor: "rgba(242, 242, 247, 0.1)",
            // borderBottom: "1px solid #334155"
          }}> 
            <div>
              <span style={{ color: "#3c506dff", fontSize: "0.85rem", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.05em", paddingLeft: "15px"}}>
                Aprende la seña
              </span>
              <h3 style={{ color: "black", fontSize: "1.5rem", fontWeight: 700, margin: 0, paddingLeft: "15px" }}>
                {selectedSign.toUpperCase()}
              </h3>
            </div>
            <button
              onClick={replayAvatar}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 12px",
                backgroundColor: "transparent",
                border: "1px solid #475569",
                borderRadius: "8px",
                color: "#475569",
                cursor: "pointer",
                fontSize: "0.875rem"
              }}
            >
              <RotateCcw style={{ width: "16px", height: "16px" }} />
              Repetir
            </button>
          </div>

          {/* Avatar 3D - GRANDE */}
          <div style={{
            flex: 1,
            backgroundColor: "#F2F2F7",
            padding: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            {/* #F2F2F7 */}
            <div style={{
              width: "100%",
              height: "100%",
              minHeight: "400px",
              borderRadius: "12px",
              overflow: "hidden",
              backgroundColor: "#0f172a"
            }}>
              <AvatarAnimationPlayer
                key={avatarKey}
                sign={selectedSign}
              />
            </div>
          </div>

          {/* Botones de palabras */}
          <div style={{
            padding: "16px",
            backgroundColor: "rgba(242, 242, 247, 0.5)",
            // borderTop: "1px solid #334155"
          }}>
            <p style={{ color: "#334155", fontSize: "0.85rem", fontWeight: "bold", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.05em", paddingLeft: "15px"}}>
              Selecciona una seña:
            </p>
            <div style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "8px",
              maxHeight: "120px",
              overflowY: "auto",
              paddingLeft: "15px"
            }}>
              {SIGNS.map((sign) => (
                <button
                  key={sign}
                  onClick={() => selectSign(sign)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "8px",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    border: "none",
                    cursor: "pointer",
                    transition: "all 0.15s",
                    backgroundColor: selectedSign === sign ? "#2563eb" : "#334155",
                    color: selectedSign === sign ? "white" : "#cbd5e1",
                    boxShadow: selectedSign === sign ? "0 4px 12px rgba(37, 99, 235, 0.3)" : "none"
                  }}
                >
                  {sign.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ====== COLUMNA DERECHA: CÁMARA + CONTROLES ====== */}
        <div style={{
          width: "50%",
          display: "flex",
          flexDirection: "column"
        }}>
          
          {/* Cámara - GRANDE */}
          <div style={{
            flex: 1,
            position: "relative",
            backgroundColor: "#F2F2F7"
          }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: "scaleX(-1)",
                zIndex: 1
              }}
            />

            <canvas
              ref={canvasRef}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                pointerEvents: "none",
                transform: "scaleX(-1)",
                zIndex: 2,
                backgroundColor: "transparent"
              }}
            />

            {/* Placeholder cuando cámara está apagada */}
            {!isCameraOn && (
              <div style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "#b6bac0ff",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 0
              }}>
                <VideoOff style={{ width: "64px", height: "64px", color: "#475569", marginBottom: "16px" }} />
                <p style={{ color: "#64748b", fontWeight: 500 }}>Cámara apagada</p>
              </div>
            )}

            {/* Indicador REC */}
            {isRecording && (
              <div style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                backgroundColor: "#dc2626",
                padding: "6px 12px",
                borderRadius: "9999px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: "0 4px 12px rgba(220, 38, 38, 0.4)",
                zIndex: 3
              }}>
                <div style={{
                  width: "8px",
                  height: "8px",
                  backgroundColor: "white",
                  borderRadius: "50%",
                  animation: "pulse 1s ease-in-out infinite"
                }} />
                <span style={{ color: "white", fontSize: "0.875rem", fontWeight: 700 }}>REC</span>
              </div>
            )}

            {/* Badge de objetivo */}
            <div style={{
              position: "absolute",
              top: "16px",
              left: "16px",
              backgroundColor: "rgba(15, 23, 42, 0.8)",
              backdropFilter: "blur(8px)",
              padding: "6px 12px",
              borderRadius: "9999px",
              zIndex: 3
            }}>
              <span style={{ color: "white", fontSize: "0.875rem" }}>
                Objetivo: <strong>{selectedSign.toUpperCase()}</strong>
              </span>
            </div>
          </div>

          {/* Feedback */}
          <div style={{
            backgroundColor: "#f2f2f7",
            padding: "16px",
            //borderTop: "1px solid #334155",
            minHeight: "60px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            {renderFeedback()}
          </div>

          {/* Controles */}
          <div style={{
            backgroundColor: "rgba(242, 242, 247, 0.5)",
            padding: "16px",
            // borderTop: "1px solid #334155"
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "16px",
              maxWidth: "400px",
              margin: "0 auto",
            }}>

              <button
                onClick={toggleCamera}
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  border: `2px solid ${isCameraOn ? "#22c55e" : "#475569"}`,
                  backgroundColor: isCameraOn ? "rgba(34, 197, 94, 0.2)" : "#1e293b",
                  color: isCameraOn ? "#22c55e" : "#94a3b8",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.15s"
                }}
              >
                {isCameraOn ? <Video size={24} /> : <VideoOff size={24} />}
              </button>

              <button
                onClick={toggleRecording}
                disabled={!isCameraOn || isValidating}
                style={{
                  flex: 1,
                  height: "56px",
                  borderRadius: "9999px",
                  border: "none",
                  fontWeight: 700,
                  fontSize: "1.125rem",
                  cursor: !isCameraOn ? "not-allowed" : "pointer",
                  boxShadow: isCameraOn ? "0 4px 12px rgba(68, 203, 149, 0.3)" : "none",
                  transition: "all 0.15s",
                  backgroundColor: !isCameraOn 
                    ? "#334155" 
                    : isRecording 
                      ? "#ef4444" 
                      : "#10b981",
                  color: !isCameraOn ? "#64748b" : "white"
                }}
              >
                {isValidating
                  ? "Validando..."
                  : isRecording
                    ? "⏹ Detener y Validar"
                    : "Intentar Seña"}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}