import { useState } from 'react';
import { ArrowLeft, Camera, Mic, Volume2, Send } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface TranslationModeProps {
  onBack: () => void;
}

export function TranslationMode({ onBack }: TranslationModeProps) {
  // Estado para Seña a Voz/Texto (mitad superior)
  const [isCapturing, setIsCapturing] = useState(false);
  const [translatedText, setTranslatedText] = useState('');
  const [showAvatarConfirm, setShowAvatarConfirm] = useState(false);

  // Estado para Voz/Texto a Seña (mitad inferior)
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [showAvatarSigns, setShowAvatarSigns] = useState(false);

  // Funciones para Seña a Voz/Texto
  const handleStartCapture = () => {
    setIsCapturing(true);
    setTranslatedText('');
    setShowAvatarConfirm(false);
    
    // Simular captura y reconocimiento de señas
    setTimeout(() => {
      setShowAvatarConfirm(true);
      setTimeout(() => {
        setTranslatedText('Hola, ¿cómo estás?');
        setShowAvatarConfirm(false);
        setIsCapturing(false);
      }, 1500);
    }, 2000);
  };

  const handlePlayVoice = () => {
    // Simular reproducción de voz del texto traducido
    console.log('Reproduciendo voz:', translatedText);
    // Aquí iría la lógica de text-to-speech
  };

  // Funciones para Voz/Texto a Seña
  const handleVoiceInput = () => {
    setIsListening(true);
    
    // Simular captura de voz
    setTimeout(() => {
      setInputText('Muy bien, gracias. ¿Y tú?');
      setIsListening(false);
    }, 2000);
  };

  const handleShowSigns = () => {
    if (!inputText.trim()) return;
    
    setShowAvatarSigns(true);
    // Simular animación del avatar haciendo las señas
    setTimeout(() => {
      setShowAvatarSigns(false);
      setInputText('');
    }, 4000);
  };

  return (
    <div className="flex flex-col h-full bg-white pb-16">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 pt-12 pb-4 flex items-center gap-4 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="rounded-full"
          aria-label="Volver"
        >
          <ArrowLeft size={24} />
        </Button>
        <h2>Traducción en Tiempo Real</h2>
      </div>

      {/* ========== MITAD SUPERIOR: SEÑA A VOZ/TEXTO ========== */}
      <div className="flex flex-col h-1/2 border-b-4 border-[#F2F2F7]">
        {/* Vista de Cámara con Avatar Superpuesto */}
        <div className="relative flex-1 bg-gradient-to-br from-gray-800 to-gray-900">
          {/* Simulación de vista de cámara */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Camera size={48} className="text-white/20" />
            {!isCapturing && !showAvatarConfirm && (
              <span className="absolute bottom-4 text-white/60 text-sm">
                Cámara lista para capturar
              </span>
            )}
          </div>

          {/* Avatar confirmando señas (superpuesto) */}
          {showAvatarConfirm && (
            <div className="absolute inset-0 bg-[#4A90E2]/95 flex items-center justify-center animate-in fade-in duration-300">
              <div className="text-white text-center">
                <div className="w-24 h-24 bg-white/20 rounded-full mx-auto mb-3 flex items-center justify-center animate-pulse">
                  <span className="text-5xl">🤟</span>
                </div>
                <p className="text-sm">Avatar confirmando señas...</p>
              </div>
            </div>
          )}

          {/* Indicador de captura activa */}
          {isCapturing && !showAvatarConfirm && (
            <div className="absolute inset-0 border-4 border-[#50E3C2] animate-pulse pointer-events-none" />
          )}
        </div>

        {/* Área de Salida de Texto */}
        <div className="shrink-0 px-4 py-3 bg-white">
          <div className="min-h-[60px] bg-[#F2F2F7] rounded-xl p-3 flex items-center justify-between">
            {translatedText ? (
              <>
                <p className="flex-1">{translatedText}</p>
                <Button
                  onClick={handlePlayVoice}
                  size="icon"
                  className="ml-3 shrink-0 bg-[#50E3C2] hover:bg-[#40D3B2] text-white rounded-full"
                  aria-label="Reproducir voz"
                >
                  <Volume2 size={20} />
                </Button>
              </>
            ) : (
              <p className="text-[#8E8E93] text-sm">
                La traducción aparecerá aquí
              </p>
            )}
          </div>
        </div>

        {/* Botón de control: Iniciar Captura */}
        <div className="shrink-0 px-4 pb-3">
          <Button
            onClick={handleStartCapture}
            disabled={isCapturing}
            className="w-full py-5 bg-[#4A90E2] hover:bg-[#3A7BC8] text-white rounded-xl flex items-center justify-center gap-3 disabled:opacity-50"
          >
            <Camera size={24} />
            {isCapturing ? 'Capturando...' : 'Iniciar Captura'}
          </Button>
        </div>
      </div>

      {/* ========== MITAD INFERIOR: VOZ/TEXTO A SEÑA ========== */}
      <div className="flex flex-col h-1/2">
        {/* Vista de Avatar para mostrar señas */}
        <div className="relative flex-1 bg-gradient-to-br from-[#50E3C2]/10 to-[#4A90E2]/10">
          {showAvatarSigns ? (
            <div className="absolute inset-0 bg-gradient-to-br from-[#50E3C2] to-[#4A90E2] flex items-center justify-center animate-in fade-in duration-300">
              <div className="text-white text-center">
                <div className="w-32 h-32 bg-white/20 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="text-6xl animate-bounce">👋</span>
                </div>
                <p>Avatar mostrando señas...</p>
                <p className="text-sm text-white/80 mt-2">"{inputText}"</p>
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-[#8E8E93]">
                <div className="text-5xl mb-2">🤖</div>
                <p className="text-sm">El avatar mostrará las señas aquí</p>
              </div>
            </div>
          )}
        </div>

        {/* Panel de Control: Entrada de Texto/Voz */}
        <div className="shrink-0 px-4 py-3 bg-white space-y-3">
          {/* Campo de texto con botón de micrófono */}
          <div className="flex gap-2">
            <Input
              placeholder="Escribe tu mensaje..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleShowSigns();
                }
              }}
              className="flex-1 h-12 rounded-xl border-2"
              disabled={isListening}
            />
            <Button
              onClick={handleVoiceInput}
              disabled={isListening}
              size="icon"
              variant="outline"
              className="h-12 w-12 shrink-0 border-2 border-[#4A90E2] text-[#4A90E2] hover:bg-[#4A90E2] hover:text-white rounded-xl"
              aria-label="Activar entrada de voz"
            >
              <Mic size={20} className={isListening ? 'animate-pulse' : ''} />
            </Button>
          </div>

          {/* Botón: Mostrar en Señas */}
          <Button
            onClick={handleShowSigns}
            disabled={!inputText.trim() || showAvatarSigns}
            className="w-full py-5 bg-[#50E3C2] hover:bg-[#40D3B2] text-white rounded-xl flex items-center justify-center gap-3 disabled:opacity-50"
          >
            <Send size={24} />
            Mostrar en Señas
          </Button>

          {isListening && (
            <p className="text-center text-sm text-[#4A90E2] animate-pulse">
              Escuchando...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
