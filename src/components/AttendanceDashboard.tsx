import { useState } from 'react';
import {
  Box,
  Container,
  Stack,
  Heading,
  Input,
  Text,
  Button,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
} from '@chakra-ui/react';
import { calculateClassesNeeded } from '../utils/attendanceCalculator';
import { ImageUploader } from './ImageUploader';

export const AttendanceDashboard = () => {
  const [classesAttended, setClassesAttended] = useState<number>(0);
  const [totalClasses, setTotalClasses] = useState<number>(0);
  const [showResults, setShowResults] = useState(false);
  const [result, setResult] = useState<{
    canMissClasses: number;
    needToAttendClasses: number;
    currentPercentage: number;
    isAboveMinimum: boolean;
  } | null>(null);

  const handleCalculate = () => {
    if (totalClasses < classesAttended) {
      alert('Total classes cannot be less than classes attended!');
      return;
    }

    const calculationResult = calculateClassesNeeded(classesAttended, totalClasses);
    setResult(calculationResult);
    setShowResults(true);
  };

  const handleReset = () => {
    setClassesAttended(0);
    setTotalClasses(0);
    setShowResults(false);
    setResult(null);
  };

  return (
    <Container maxW="container.md" py={8}>
      <Stack gap={6}>
        <Heading textAlign="center" mb={6}>
          Attendance Calculator
        </Heading>

        <Tabs isFitted variant="enclosed">
          <TabList mb="1em">
            <Tab>Manual Input</Tab>
            <Tab>Upload Image</Tab>
          </TabList>

          <TabPanels>
            <TabPanel>
              <Box p={6} borderWidth={1} borderRadius="lg" bg="white">
                <Stack gap={4}>
                  <Box>
                    <Text mb={2}>Classes Attended</Text>
                    <Input
                      type="number"
                      value={classesAttended}
                      onChange={(e) => setClassesAttended(Number(e.target.value))}
                      min={0}
                    />
                  </Box>

                  <Box>
                    <Text mb={2}>Total Classes</Text>
                    <Input
                      type="number"
                      value={totalClasses}
                      onChange={(e) => setTotalClasses(Number(e.target.value))}
                      min={0}
                    />
                  </Box>

                  <Button colorScheme="blue" onClick={handleCalculate} width="full">
                    Calculate
                  </Button>

                  <Button variant="outline" onClick={handleReset} width="full">
                    Reset
                  </Button>
                </Stack>
              </Box>
            </TabPanel>

            <TabPanel>
              <Box p={6} borderWidth={1} borderRadius="lg" bg="white">
                <Stack gap={4}>
                  <Text>Upload an image of your attendance details</Text>
                  <ImageUploader
                    onDataExtracted={(attended, total) => {
                      setClassesAttended(attended);
                      setTotalClasses(total);
                      handleCalculate();
                    }}
                  />
                </Stack>
              </Box>
            </TabPanel>
          </TabPanels>
        </Tabs>

        {showResults && result && (
          <Box
            p={6}
            bg={result.isAboveMinimum ? 'green.100' : 'yellow.100'}
            borderRadius="lg"
            textAlign="center"
          >
            <Heading size="md" mb={4}>
              {result.isAboveMinimum
                ? 'Your attendance is above minimum requirement!'
                : 'Your attendance is below minimum requirement!'}
            </Heading>
            <Text fontSize="lg">Current Attendance: {result.currentPercentage.toFixed(2)}%</Text>
            {result.isAboveMinimum ? (
              <Text fontSize="lg" mt={2}>You can miss up to {result.canMissClasses} more classes</Text>
            ) : (
              <Text fontSize="lg" mt={2}>You need to attend {result.needToAttendClasses} more classes</Text>
            )}
          </Box>
        )}
      </Stack>
    </Container>
  );
};