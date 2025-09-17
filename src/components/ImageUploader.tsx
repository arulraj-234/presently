import { useState, useCallback } from 'react';
import {
  Box,
  Button,
  Image,
  Text,
  VStack,
  useToast,
  Progress,
  Center,
} from '@chakra-ui/react';
import { createWorker } from 'tesseract.js';

interface ImageUploaderProps {
  onDataExtracted: (classesAttended: number, totalClasses: number) => void;
}

export const ImageUploader = ({ onDataExtracted }: ImageUploaderProps) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const toast = useToast();

  const processImage = async (file: File) => {
    try {
      setIsProcessing(true);
      const worker = await createWorker('eng', undefined, {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === 'recognizing text') {
            setProgress(m.progress * 100);
          }
        },
      });

      // Recognize text in image
      const { data: { text } } = await worker.recognize(file);
      await worker.terminate();

      // Extract numbers from the text
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
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        processImage(file);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  return (
    <Box width="100%">
      <VStack spacing={4} align="stretch">
        <Button
          as="label"
          htmlFor="image-upload"
          cursor="pointer"
          colorScheme="blue"
          variant="outline"
          isDisabled={isProcessing}
        >
          {isProcessing ? 'Processing...' : 'Upload Attendance Image'}
          <input
            id="image-upload"
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            style={{ display: 'none' }}
            disabled={isProcessing}
          />
        </Button>

        {isProcessing && (
          <Box>
            <Text mb={2}>Processing image... {Math.round(progress)}%</Text>
            <Progress value={progress} size="sm" colorScheme="blue" />
          </Box>
        )}

        {selectedImage && (
          <Center>
            <Image
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