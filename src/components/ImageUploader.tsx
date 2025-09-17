import { useState, useCallback } from 'react';
import {
  Box,
  Image as ChakraImage,
  Text,
  VStack,
  useToast,
  Progress,
  Center,
  Skeleton,
  SkeletonText,
} from '@chakra-ui/react';
import Tesseract from 'tesseract.js';
import { parseAttendanceText, type ParsedSubject } from '../utils/parseAttendance';

interface ImageUploaderProps {
  onDataExtracted: (classesAttended: number, totalClasses: number) => void;
  onMultiExtracted?: (subjects: ParsedSubject[]) => void;
  useAI?: boolean;
  onOcrText?: (text: string) => void;
}

export const ImageUploader = ({ onDataExtracted, onMultiExtracted, useAI, onOcrText }: ImageUploaderProps) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const toast = useToast();

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Unsupported file',
        description: 'Please upload an image file (png, jpg, etc.)',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = async () => {
      const dataUrl = reader.result as string;
      setSelectedImage(dataUrl);
      await processImage(file, dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const processImage = async (file: File | null, dataUrl?: string) => {
    try {
      setIsProcessing(true);
      // If AI extraction is enabled, try backend first
      if (useAI && onMultiExtracted && dataUrl) {
        try {
          const resp = await fetch('/api/extract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageBase64: dataUrl }),
          });
          if (resp.ok) {
            const json = await resp.json();
            const subjects = Array.isArray(json.subjects) ? json.subjects as ParsedSubject[] : [];
            if (subjects.length > 0) {
              onMultiExtracted(subjects);
              return; // Skip local OCR when AI succeeds
            }
          }
        } catch (e) {
          // Inform user and fall back to local OCR below
          toast({
            title: 'AI extraction unavailable',
            description: 'Falling back to on-device OCR.',
            status: 'warning',
            duration: 2500,
            isClosable: true,
          });
        }
      }
      // Preprocess image to improve OCR accuracy
      const preprocessedCanvas = file ? await preprocessImage(file) : null;
      if (!preprocessedCanvas) throw new Error('No image to process');

      // Recognize text in image with progress logger
      const { data: { text } } = await Tesseract.recognize(preprocessedCanvas, 'eng', {
        logger: (m: any) => {
          if (typeof m.progress === 'number') {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });
      if (onOcrText) onOcrText(text);

      // Extract numbers from the text
      // Try to parse multi-subject first
      const subjects = parseAttendanceText(text);
      if (onMultiExtracted && subjects.length > 0) {
        onMultiExtracted(subjects);
        return;
      }

      // Fallback: simple two-number extraction for single summary
      const numbers = text.match(/\d+/g)?.map(Number) || [];
      
      if (numbers.length >= 2) {
        // Assume first number is classes attended and second is total classes
        const classesAttended = numbers[0];
        const totalClasses = numbers[1];
        
        if (classesAttended <= totalClasses) {
          onDataExtracted(classesAttended, totalClasses);
        } else {
          toast({
            title: 'Invalid numbers detected',
            description: 'Classes attended cannot be more than total classes',
            status: 'error',
            duration: 3000,
            isClosable: true,
          });
        }
      } else {
        toast({
          title: 'Could not extract numbers',
          description: 'Please ensure your image contains clear attendance numbers',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      toast({
        title: 'Error processing image',
        description: 'Please try again with a different image',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  }, []);

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!isProcessing) setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (isProcessing) return;
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  // Basic preprocessing: resize to max width, grayscale, and increase contrast
  const preprocessImage = (file: File): Promise<HTMLCanvasElement> => {
    return new Promise((resolve, reject) => {
      const img: HTMLImageElement = document.createElement('img');
      const url = URL.createObjectURL(file);
      img.onload = () => {
        try {
          const maxWidth = 1600;
          const scale = img.width > maxWidth ? maxWidth / img.width : 1;
          const width = Math.floor(img.width * scale);
          const height = Math.floor(img.height * scale);

          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Canvas not supported');
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          // Get image data and apply grayscale + contrast
          const imageData = ctx.getImageData(0, 0, width, height);
          const data = imageData.data;
          // Contrast factor: stronger for web tables
          const contrast = 1.5;
          const intercept = 128 * (1 - contrast);
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            // Luminance based grayscale
            let gray = 0.299 * r + 0.587 * g + 0.114 * b;
            // Apply contrast + simple threshold to binarize
            gray = gray * contrast + intercept;
            gray = gray > 160 ? 255 : gray < 80 ? 0 : gray;
            gray = Math.max(0, Math.min(255, gray));
            data[i] = data[i + 1] = data[i + 2] = gray;
          }
          ctx.putImageData(imageData, 0, 0);

          URL.revokeObjectURL(url);
          resolve(canvas);
        } catch (e) {
          URL.revokeObjectURL(url);
          reject(e);
        }
      };
      img.onerror = (e: string | Event) => {
        URL.revokeObjectURL(url);
        reject(e);
      };
      img.src = url;
    });
  };

  return (
    <Box width="100%" position="relative">
      <VStack spacing={4} align="stretch">
        <Box
          p={6}
          borderWidth="2px"
          borderStyle="dashed"
          borderColor={isDragging ? 'blue.400' : 'gray.300'}
          borderRadius="md"
          textAlign="center"
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          role="button"
          aria-label="Upload attendance image by clicking or dragging and dropping"
          cursor={isProcessing ? 'not-allowed' : 'pointer'}
          opacity={isProcessing ? 0.7 : 1}
          onClick={() => {
            if (isProcessing) return;
            const input = document.getElementById('image-upload') as HTMLInputElement | null;
            input?.click();
          }}
        >
          <Text fontWeight="medium" mb={2}>
            {isProcessing ? 'Processing...' : 'Click to upload or drag & drop an image here'}
          </Text>
          <Text fontSize="sm" color="gray.500">PNG, JPG up to a few MB</Text>
          <input
            id="image-upload"
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            style={{ display: 'none' }}
            disabled={isProcessing}
          />
        </Box>

        {isProcessing && (
          <Box p={4} borderWidth={1} borderRadius="md">
            <Skeleton height="16px" mb={2} />
            <SkeletonText noOfLines={3} spacing={2} skeletonHeight="12px" />
          </Box>
        )}

        {isProcessing && (
          <Center>
            <Text fontSize="sm">Please wait while we process the image...</Text>
          </Center>
        )}

        {isProcessing && (
          <Box>
            <Text mb={2}>Processing image... {Math.round(progress)}%</Text>
            <Progress value={progress} size="sm" colorScheme="blue" />
          </Box>
        )}

        {selectedImage && (
          <Center>
            <ChakraImage
              src={selectedImage}
              alt="Uploaded attendance"
              maxH="200px"
              objectFit="contain"
              borderRadius="md"
            />
          </Center>
        )}
      </VStack>
    </Box>
  );
};