import React, { useRef, useState, useEffect } from 'react';
import { Box, Button, HStack, useColorModeValue } from '@chakra-ui/react';

interface CropperProps {
  imageSrc: string;
  onCropped: (canvas: HTMLCanvasElement) => void;
}

// Lightweight, dependency-free rectangular cropper
export const Cropper: React.FC<CropperProps> = ({ imageSrc, onCropped }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [start, setStart] = useState<{ x: number; y: number } | null>(null);
  const [rect, setRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const overlayColor = useColorModeValue('rgba(0,0,0,0.2)', 'rgba(255,255,255,0.15)');
  const borderColor = useColorModeValue('#3b84ff', '#5f9aff');

  useEffect(() => {
    setRect(null);
  }, [imageSrc]);

  const onMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const bounds = containerRef.current.getBoundingClientRect();
    const x = e.clientX - bounds.left;
    const y = e.clientY - bounds.top;
    setStart({ x, y });
    setDragging(true);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !start || !containerRef.current) return;
    const bounds = containerRef.current.getBoundingClientRect();
    const x = e.clientX - bounds.left;
    const y = e.clientY - bounds.top;
    const w = Math.max(1, x - start.x);
    const h = Math.max(1, y - start.y);
    setRect({ x: start.x, y: start.y, w, h });
  };

  const onMouseUp = () => {
    setDragging(false);
  };

  const handleCrop = () => {
    if (!imgRef.current || !rect || !containerRef.current) return;
    const img = imgRef.current;
    // Map rect (container coords) to image natural coords
    const scaleX = img.naturalWidth / img.clientWidth;
    const scaleY = img.naturalHeight / img.clientHeight;
    const sx = Math.max(0, Math.floor(rect.x * scaleX));
    const sy = Math.max(0, Math.floor(rect.y * scaleY));
    const sw = Math.max(1, Math.floor(rect.w * scaleX));
    const sh = Math.max(1, Math.floor(rect.h * scaleY));

    const canvas = document.createElement('canvas');
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    onCropped(canvas);
  };

  return (
    <Box>
      <Box
        ref={containerRef}
        position="relative"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        borderWidth="1px"
        borderRadius="md"
        overflow="hidden"
      >
        <img ref={imgRef} src={imageSrc} alt="to-crop" style={{ width: '100%', display: 'block' }} />
        {rect && (
          <Box
            position="absolute"
            left={`${rect.x}px`}
            top={`${rect.y}px`}
            width={`${rect.w}px`}
            height={`${rect.h}px`}
            border={`2px solid ${borderColor}`}
            background={overlayColor}
            pointerEvents="none"
          />
        )}
      </Box>
      <HStack mt={2}>
        <Button onClick={handleCrop} isDisabled={!rect}>Apply Crop</Button>
        <Button variant="ghost" onClick={() => setRect(null)} isDisabled={!rect}>Reset</Button>
      </HStack>
    </Box>
  );
};
