import { useState, useRef } from 'react';

export function useDraggable(initialPosition = { x: 0, y: 0 }) {
  const [position, setPosition] = useState(initialPosition);
  const isDragging = useRef(false);
  const dragStartInfo = useRef({ x: 0, y: 0, startLeft: 0, startTop: 0 });

  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    dragStartInfo.current = {
      x: e.clientX,
      y: e.clientY,
      startLeft: position.x,
      startTop: position.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    setPosition({
      x: dragStartInfo.current.startLeft + (e.clientX - dragStartInfo.current.x),
      y: dragStartInfo.current.startTop + (e.clientY - dragStartInfo.current.y),
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  return { position, handlePointerDown, handlePointerMove, handlePointerUp };
}
