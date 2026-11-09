import { useEffect, useState } from 'react';

let hardwareCache: boolean | null = null;

/**
 * ¿WebGL corre en una GPU real? Sin aceleración (SwiftShader, llvmpipe, "Basic Render"),
 * el navegador compila y dibuja los shaders con la CPU: segundos de bloqueo por cuadro.
 * Es el caso de Lighthouse/PageSpeed y de algunos equipos muy viejos.
 * Solo lee el nombre del renderer: no compila nada.
 */
export function hasHardwareWebGL(): boolean {
  if (hardwareCache !== null) return hardwareCache;
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl2') || canvas.getContext('webgl')) as WebGLRenderingContext | null;
    if (!gl) {
      hardwareCache = false;
      return false;
    }
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = String(
      info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)
    ).toLowerCase();
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    hardwareCache = !/swiftshader|llvmpipe|softpipe|software|basic render|mesa offscreen/.test(renderer);
  } catch {
    hardwareCache = false;
  }
  return hardwareCache;
}

/** Celular/tablet: los efectos dibujan a 30 fps (alcanza para un rayo y gasta la mitad). */
export const EFFECT_FRAME_MS =
  typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches ? 1000 / 30 : 0;

let readyPromise: Promise<void> | null = null;

function whenPageSettled(): Promise<void> {
  if (!readyPromise) {
    readyPromise = new Promise<void>((resolve) => {
      const idle = () => {
        const ric = (window as Window & {
          requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
        }).requestIdleCallback;
        if (ric) ric(() => resolve(), { timeout: 1500 });
        else setTimeout(resolve, 300);
      };
      if (document.readyState === 'complete') idle();
      else window.addEventListener('load', idle, { once: true });
    });
  }
  return readyPromise;
}

/**
 * true cuando conviene montar los efectos WebGL: la página ya cargó (no compiten con
 * la foto principal) y hay GPU real. Sin GPU queda en false y se ve el marco estático.
 */
export function useEffectsReady(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void whenPageSettled().then(() => {
      if (!cancelled && hasHardwareWebGL()) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return ready;
}
