import { useEffect, useState } from 'react';
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
  useToast,
  FormControl,
  FormLabel,
  HStack,
  NumberInput,
  NumberInputField,
  useColorModeValue,
  FormErrorMessage,
  FormHelperText,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Switch,
  Badge,
  Tag,
  TagLabel,
  Select,
  Image as ChakraImage,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
} from '@chakra-ui/react';
import { calculateClassesNeeded } from '../utils/attendanceCalculator';
import { ImageUploader } from './ImageUploader';
import type { ParsedSubject } from '../utils/parseAttendance';
import logo from '../assets/logo.svg';

export const AttendanceDashboard = () => {
  const [classesAttended, setClassesAttended] = useState<string>('');
  const [totalClasses, setTotalClasses] = useState<string>('');
  const [minimumPercentage, setMinimumPercentage] = useState<number>(75);
  const [showResults, setShowResults] = useState(false);
  const [result, setResult] = useState<{
    canMissClasses: number;
    needToAttendClasses: number;
    currentPercentage: number;
    isAboveMinimum: boolean;
  } | null>(null);
  const toast = useToast();
  const [subjects, setSubjects] = useState<ParsedSubject[]>([]);
  const [useAI, setUseAI] = useState<boolean>(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [activeSubject, setActiveSubject] = useState<ParsedSubject | null>(null);
  const [showOcr, setShowOcr] = useState<boolean>(false);
  const [ocrText, setOcrText] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [sortKey, setSortKey] = useState<'percent'|'total'|'present'|'absent'|'advice'>('percent');
  const [sortDir, setSortDir] = useState<'desc'|'asc'>('desc');
  const [compact, setCompact] = useState<boolean>(false);
  const [editName, setEditName] = useState<string>('');
  const [renames, setRenames] = useState<Record<string, string>>({}); // key: code || original name => new name

  // Load persisted settings
  useEffect(() => {
    try {
      const mp = localStorage.getItem('presently.minimumPercentage');
      if (mp) setMinimumPercentage(Number(mp));
      const ai = localStorage.getItem('presently.useAI');
      if (ai) setUseAI(ai === 'true');
      const ct = localStorage.getItem('presently.compact');
      if (ct) setCompact(ct === 'true');
      const rn = localStorage.getItem('presently.renames');
      if (rn) setRenames(JSON.parse(rn));
    } catch {}
  }, []);

  // Persist settings
  useEffect(() => {
    try { localStorage.setItem('presently.minimumPercentage', String(minimumPercentage)); } catch {}
  }, [minimumPercentage]);
  useEffect(() => {
    try { localStorage.setItem('presently.useAI', String(useAI)); } catch {}
  }, [useAI]);
  useEffect(() => {
    try { localStorage.setItem('presently.compact', String(compact)); } catch {}
  }, [compact]);
  useEffect(() => {
    try { localStorage.setItem('presently.renames', JSON.stringify(renames)); } catch {}
  }, [renames]);

  const downloadCsv = () => {
    if (subjects.length === 0) return;
    const header = ['Subject','Total','Present','Absent','Percentage'];
    const rows = subjects.map(s => [s.name, s.total, s.present, s.absent, s.percentage.toFixed(2)]);
    const csv = [header, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'attendance.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCalculate = () => {
    const attendedNum = classesAttended.trim() === '' ? NaN : Number(classesAttended);
    const totalNum = totalClasses.trim() === '' ? NaN : Number(totalClasses);

    if (Number.isNaN(attendedNum) || Number.isNaN(totalNum)) {
      toast({
        title: 'Missing input',
        description: 'Please fill both Classes Attended and Total Classes.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (attendedNum < 0 || totalNum < 0) {
      toast({
        title: 'Invalid input',
        description: 'Values cannot be negative.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (totalNum < attendedNum) {
      toast({
        title: 'Invalid input',
        description: 'Total classes cannot be less than classes attended.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    const calculationResult = calculateClassesNeeded(attendedNum, totalNum, minimumPercentage);
    setResult(calculationResult);
    setShowResults(true);
  };

  const handleReset = () => {
    setClassesAttended('');
    setTotalClasses('');
    setMinimumPercentage(75);
    setShowResults(false);
    setResult(null);
    setSubjects([]);
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
              <Box p={6} borderWidth={1} borderRadius="lg" bg={useColorModeValue('white', 'gray.800')}>
                <Stack gap={4}>
                  <FormControl isInvalid={classesAttended !== '' && Number(classesAttended) < 0}>
                    <FormLabel>Classes Attended</FormLabel>
                    <Input
                      type="number"
                      value={classesAttended}
                      onChange={(e) => setClassesAttended(e.target.value)}
                      min={0}
                    />
                    <FormHelperText>Enter how many classes you have attended.</FormHelperText>
                    <FormErrorMessage>Value cannot be negative.</FormErrorMessage>
                  </FormControl>

                  <FormControl isInvalid={
                    (totalClasses !== '' && Number(totalClasses) < 0) ||
                    (classesAttended !== '' && totalClasses !== '' && Number(totalClasses) < Number(classesAttended))
                  }>
                    <FormLabel>Total Classes</FormLabel>
                    <Input
                      type="number"
                      value={totalClasses}
                      onChange={(e) => setTotalClasses(e.target.value)}
                      min={0}
                    />
                    {totalClasses !== '' && classesAttended !== '' && Number(totalClasses) < Number(classesAttended) ? (
                      <FormErrorMessage>Total cannot be less than attended.</FormErrorMessage>
                    ) : (
                      <FormHelperText>Total number of classes conducted.</FormHelperText>
                    )}
                  </FormControl>

                  <HStack>
                    <FormControl isInvalid={minimumPercentage <= 0 || minimumPercentage >= 100}>
                      <FormLabel>Minimum Percentage</FormLabel>
                      <NumberInput min={1} max={99} value={minimumPercentage} onChange={(_, v) => setMinimumPercentage(Number.isNaN(v) ? 0 : v)}>
                        <NumberInputField />
                      </NumberInput>
                      {minimumPercentage > 0 && minimumPercentage < 100 ? (
                        <FormHelperText>Target attendance threshold (1–99%).</FormHelperText>
                      ) : (
                        <FormErrorMessage>Enter a value between 1 and 99.</FormErrorMessage>
                      )}
                    </FormControl>
                  </HStack>

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
              <Box p={6} borderWidth={1} borderRadius="lg" bg={useColorModeValue('white', 'gray.800')} boxShadow="sm">
                <Stack gap={4}>
                  <Text>Upload an image of your attendance details</Text>
                  <HStack>
                    <FormControl display="flex" alignItems="center">
                      <FormLabel htmlFor="use-ai" mb="0">Use AI extraction</FormLabel>
                      <Switch id="use-ai" isChecked={useAI} onChange={(e) => setUseAI(e.target.checked)} />
                      <FormHelperText ml={2}>Requires backend running at /api/extract</FormHelperText>
                    </FormControl>
                    <Tag size="md" colorScheme={useAI ? 'green' : 'gray'}>
                      <TagLabel>{useAI ? 'Mode: AI' : 'Mode: Local'}</TagLabel>
                    </Tag>
                  </HStack>
                  <HStack>
                    <FormControl display="flex" alignItems="center">
                      <FormLabel htmlFor="show-ocr" mb="0">Show OCR text</FormLabel>
                      <Switch id="show-ocr" isChecked={showOcr} onChange={(e) => setShowOcr(e.target.checked)} />
                    </FormControl>
                    <FormControl display="flex" alignItems="center">
                      <FormLabel htmlFor="compact" mb="0">Compact table</FormLabel>
                      <Switch id="compact" isChecked={compact} onChange={(e) => setCompact(e.target.checked)} />
                    </FormControl>
                  </HStack>
                  {/* Banner moved from manual input panel to Upload panel */}
                  <Box p={3} borderWidth={1} borderRadius="md" bg={useColorModeValue('brand.50','gray.700')} display="flex" alignItems="center" gap={3}>
                    <ChakraImage src={logo} alt="Presently" boxSize="24px" />
                    <Text fontSize="sm">Tip: Clear, well-lit screenshots work best. For portal pages, try zooming into the table before capturing.</Text>
                  </Box>

                  <ImageUploader
                    onDataExtracted={(attended, total) => {
                      setClassesAttended(String(attended));
                      setTotalClasses(String(total));
                      // Only auto-calculate if the extracted data is valid
                      if (total >= attended && attended >= 0) {
                        const calc = calculateClassesNeeded(attended, total, minimumPercentage);
                        setResult(calc);
                        setShowResults(true);
                      } // else: ignore silently; multi-subject table likely handled
                    }}
                    onMultiExtracted={(subs) => {
                      // Apply renames if available (prefer code as key, else original name)
                      const mapped = subs.map(s => {
                        const key = s.code || s.name;
                        const newName = renames[key];
                        return newName ? { ...s, name: newName } : s;
                      });
                      setSubjects(mapped);
                    }}
                    useAI={useAI}
                    onOcrText={(t) => setOcrText(t)}
                  />

                  {showOcr && ocrText && (
                    <Box mt={2} p={3} borderWidth={1} borderRadius="md" bg={useColorModeValue('gray.50', 'gray.700')}>
                      <Heading size="sm" mb={2}>OCR Text</Heading>
                      <Box as="pre" fontSize="xs" whiteSpace="pre-wrap">
                        {ocrText}
                      </Box>
                    </Box>
                  )}

                  {subjects.length > 0 && (
                    <Box>
                      <HStack justify="space-between" align="center" mb={2}>
                        <Heading size="md">Parsed Subjects</Heading>
                        <Button size="sm" onClick={downloadCsv} colorScheme="brand" variant="solid">Download CSV</Button>
                      </HStack>
                      <HStack mb={2} gap={3} align="center">
                        <FormControl maxW="280px">
                          <FormLabel mb={1} fontSize="sm">Search</FormLabel>
                          <Input size="sm" placeholder="Filter by subject name" value={search} onChange={(e) => setSearch(e.target.value)} />
                        </FormControl>
                        <FormControl maxW="220px">
                          <FormLabel mb={1} fontSize="sm">Sort by</FormLabel>
                          <Select size="sm" value={sortKey} onChange={(e) => setSortKey(e.target.value as any)}>
                            <option value="percent">Percentage</option>
                            <option value="total">Total</option>
                            <option value="present">Present</option>
                            <option value="absent">Absent</option>
                            <option value="advice">Advice (Can miss)</option>
                          </Select>
                        </FormControl>
                        <FormControl maxW="160px">
                          <FormLabel mb={1} fontSize="sm">Order</FormLabel>
                          <Select size="sm" value={sortDir} onChange={(e) => setSortDir(e.target.value as any)}>
                            <option value="desc">Descending</option>
                            <option value="asc">Ascending</option>
                          </Select>
                        </FormControl>
                      </HStack>
                      <Table variant="striped" size={compact ? 'xs' : 'sm'}>
                        <Thead>
                          <Tr>
                            <Th position="sticky" top={0} bg={useColorModeValue('brand.50','gray.800')}
                              onClick={() => { setSortKey('percent'); setSortDir(sortKey==='percent'&&sortDir==='desc'?'asc':'desc'); }}
                              cursor="pointer">
                              Subject
                            </Th>
                            <Th isNumeric position="sticky" top={0} bg={useColorModeValue('brand.50','gray.800')}
                              onClick={() => { setSortKey('total'); setSortDir(sortKey==='total'&&sortDir==='desc'?'asc':'desc'); }}
                              cursor="pointer">
                              Total (TH/TC){sortKey==='total' ? (sortDir==='desc'?' ↓':' ↑') : ''}
                            </Th>
                            <Th isNumeric position="sticky" top={0} bg={useColorModeValue('brand.50','gray.800')}
                              onClick={() => { setSortKey('present'); setSortDir(sortKey==='present'&&sortDir==='desc'?'asc':'desc'); }}
                              cursor="pointer">
                              Present (PH){sortKey==='present' ? (sortDir==='desc'?' ↓':' ↑') : ''}
                            </Th>
                            <Th isNumeric position="sticky" top={0} bg={useColorModeValue('brand.50','gray.800')}
                              onClick={() => { setSortKey('absent'); setSortDir(sortKey==='absent'&&sortDir==='desc'?'asc':'desc'); }}
                              cursor="pointer">
                              Absent (AH){sortKey==='absent' ? (sortDir==='desc'?' ↓':' ↑') : ''}
                            </Th>
                            <Th isNumeric position="sticky" top={0} bg={useColorModeValue('brand.50','gray.800')}
                              onClick={() => { setSortKey('percent'); setSortDir(sortKey==='percent'&&sortDir==='desc'?'asc':'desc'); }}
                              cursor="pointer">
                              %{sortKey==='percent' ? (sortDir==='desc'?' ↓':' ↑') : ''}
                            </Th>
                            <Th position="sticky" top={0} bg={useColorModeValue('brand.50','gray.800')}>Status</Th>
                            <Th position="sticky" top={0} bg={useColorModeValue('brand.50','gray.800')}
                              onClick={() => { setSortKey('advice'); setSortDir(sortKey==='advice'&&sortDir==='desc'?'asc':'desc'); }}
                              cursor="pointer">
                              Advice{sortKey==='advice' ? (sortDir==='desc'?' ↓':' ↑') : ''}
                            </Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {subjects
                            .filter(s => s.name.toLowerCase().includes(search.toLowerCase()))
                            .slice()
                            .sort((a, b) => {
                              const pick = (s: any) => {
                                if (sortKey === 'percent') return s.percentage;
                                if (sortKey === 'advice') {
                                  const calc = calculateClassesNeeded(s.present, s.total, minimumPercentage);
                                  return calc.canMissClasses;
                                }
                                return s[sortKey];
                              };
                              const va = pick(a); const vb = pick(b);
                              return sortDir === 'desc' ? (vb - va) : (va - vb);
                            })
                            .map((s, idx) => {
                            const calc = calculateClassesNeeded(s.present, s.total, minimumPercentage);
                            const statusColor = calc.isAboveMinimum ? 'green' : 'yellow';
                            const advice = calc.isAboveMinimum
                              ? `Can miss ${calc.canMissClasses}`
                              : `Attend ${calc.needToAttendClasses}`;
                            return (
                              <Tr key={idx} _hover={{ bg: useColorModeValue('gray.50', 'gray.700') }} cursor="pointer" onClick={() => { setActiveSubject(s); onOpen(); }}>
                                <Td>
                                  <Box>
                                    <Text fontWeight="medium">{s.name}</Text>
                                    {s.code && s.code.toLowerCase() !== s.name.toLowerCase() && (
                                      <Text fontSize="xs" color={useColorModeValue('gray.600','gray.400')}>{s.code}</Text>
                                    )}
                                  </Box>
                                </Td>
                                <Td isNumeric>{s.total}</Td>
                                <Td isNumeric>{s.present}</Td>
                                <Td isNumeric>{s.absent}</Td>
                                <Td isNumeric>{s.percentage.toFixed(2)}</Td>
                                <Td>
                                  <Badge colorScheme={statusColor}>
                                    {calc.isAboveMinimum ? 'Above' : 'Below'}
                                  </Badge>
                                </Td>
                                <Td>{advice}</Td>
                              </Tr>
                            );
                          })}
                        </Tbody>
                      </Table>
                      {/* Overall combined summary */}
                      {(() => {
                        const totalAll = subjects.reduce((acc, s) => acc + s.total, 0);
                        const presentAll = subjects.reduce((acc, s) => acc + s.present, 0);
                        const percentAll = totalAll > 0 ? (presentAll / totalAll) * 100 : 0;
                        const calcAll = calculateClassesNeeded(presentAll, totalAll, minimumPercentage);
                        return (
                          <Box mt={4} p={4} borderWidth={1} borderRadius="md" bg={useColorModeValue('gray.50', 'gray.700')}>
                            <Heading size="sm">Overall Attendance</Heading>
                            <HStack justify="space-between" wrap="wrap">
                              <Text>Total: {totalAll}</Text>
                              <Text>Present: {presentAll}</Text>
                              <Text>Absent: {Math.max(0, totalAll - presentAll)}</Text>
                              <Text>Current: {percentAll.toFixed(2)}%</Text>
                              <Badge colorScheme={calcAll.isAboveMinimum ? 'green' : 'yellow'}>
                                {calcAll.isAboveMinimum ? 'Above' : 'Below'}
                              </Badge>
                              <Text>
                                {calcAll.isAboveMinimum ? `Can miss ${calcAll.canMissClasses}` : `Attend ${calcAll.needToAttendClasses}`}
                              </Text>
                            </HStack>
                          </Box>
                        );
                      })()}
                    </Box>
                  )}
                </Stack>
              </Box>
            </TabPanel>
          </TabPanels>
        </Tabs>

        {showResults && result && (
          <Box
            p={6}
            bg={result.isAboveMinimum ? useColorModeValue('green.100', 'green.700') : useColorModeValue('yellow.100', 'yellow.700')}
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

        {/* Subject Detail Modal */}
        <Modal isOpen={isOpen} onClose={onClose} size="lg">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Subject Details</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              {activeSubject ? (
                (() => {
                  const s = activeSubject;
                  const calcDefault = calculateClassesNeeded(s.present, s.total, minimumPercentage);
                  const calcRelief = calculateClassesNeeded(s.present, s.total, 65);
                  const statusColor = calcDefault.isAboveMinimum ? 'green' : 'yellow';
                  const isAutoName = /^Subject\s+\d+$/i.test(s.name);
                  const adviceBg = useColorModeValue(
                    calcDefault.isAboveMinimum ? 'green.50' : 'yellow.50',
                    calcDefault.isAboveMinimum ? 'green.700' : 'yellow.700'
                  );
                  const adviceBorder = calcDefault.isAboveMinimum ? 'green.300' : 'yellow.300';
                  const reliefBg = useColorModeValue(
                    calcRelief.isAboveMinimum ? 'green.50' : 'yellow.50',
                    calcRelief.isAboveMinimum ? 'green.700' : 'yellow.700'
                  );
                  const reliefBorder = calcRelief.isAboveMinimum ? 'green.300' : 'yellow.300';
                  return (
                    <Stack gap={4}>
                      <Heading size="md">{s.name}</Heading>
                      {s.code && s.code.toLowerCase() !== s.name.toLowerCase() && (
                        <Text fontSize="xs" color={useColorModeValue('gray.600','gray.400')}>{s.code}</Text>
                      )}
                      <HStack>
                        <FormControl maxW="320px">
                          <FormLabel mb={1} fontSize="sm">Rename subject</FormLabel>
                          <Input size="sm" value={editName || s.name} onChange={(e) => setEditName(e.target.value)} placeholder="Enter subject name" />
                        </FormControl>
                        <Button size="sm" onClick={() => {
                          const newName = (editName || s.name).trim();
                          if (!newName) return;
                          setSubjects(prev => {
                            const idx = prev.findIndex(ps => ps === s);
                            if (idx === -1) return prev;
                            const copy = prev.slice();
                            copy[idx] = { ...prev[idx], name: newName };
                            return copy;
                          });
                          // Save rename mapping
                          const key = s.code || s.name;
                          setRenames(prev => ({ ...prev, [key]: newName }));
                          setEditName('');
                        }}>Save</Button>
                      </HStack>
                      {isAutoName && (
                        <Text fontSize="xs" color={useColorModeValue('gray.600','gray.300')}>
                          Tip: This looks like an auto name. Rename it to the correct subject for clarity.
                        </Text>
                      )}
                      <HStack spacing={4} wrap="wrap">
                        <Box p={3} borderWidth={1} borderRadius="md">
                          <Text fontSize="sm" color={useColorModeValue('gray.600','gray.300')}>Total</Text>
                          <Heading size="md">{s.total}</Heading>
                        </Box>
                        <Box p={3} borderWidth={1} borderRadius="md">
                          <Text fontSize="sm" color={useColorModeValue('gray.600','gray.300')}>Present</Text>
                          <Heading size="md">{s.present}</Heading>
                        </Box>
                        <Box p={3} borderWidth={1} borderRadius="md">
                          <Text fontSize="sm" color={useColorModeValue('gray.600','gray.300')}>Absent</Text>
                          <Heading size="md">{s.absent}</Heading>
                        </Box>
                        <Box p={3} borderWidth={1} borderRadius="md">
                          <Text fontSize="sm" color={useColorModeValue('gray.600','gray.300')}>Percentage</Text>
                          <Heading size="md">{s.percentage.toFixed(2)}%</Heading>
                        </Box>
                        <Box p={3} borderWidth={1} borderRadius="md">
                          <Text fontSize="sm" color={useColorModeValue('gray.600','gray.300')}>Status</Text>
                          <Badge colorScheme={statusColor}>{calcDefault.isAboveMinimum ? 'Above' : 'Below'}</Badge>
                        </Box>
                      </HStack>
                      <Box p={3} borderWidth={1} borderRadius="md" bg={adviceBg} borderColor={adviceBorder}>
                        <Text fontWeight="semibold">Advice for {minimumPercentage}% minimum</Text>
                        <Text mt={1}>
                          {calcDefault.isAboveMinimum
                            ? `You can miss ${calcDefault.canMissClasses} more classes and still stay above ${minimumPercentage}%.`
                            : `You need to attend ${calcDefault.needToAttendClasses} more classes to reach ${minimumPercentage}%.`}
                        </Text>
                      </Box>
                      <Box p={3} borderWidth={1} borderRadius="md" bg={reliefBg} borderColor={reliefBorder}>
                        <Text fontWeight="semibold">With 10% medical relief (minimum 65%)</Text>
                        <Text mt={1}>
                          {calcRelief.isAboveMinimum
                            ? `You can miss ${calcRelief.canMissClasses} more classes and stay above 65%.`
                            : `You need to attend ${calcRelief.needToAttendClasses} more classes to reach 65%.`}
                        </Text>
                      </Box>
                    </Stack>
                  );
                })()
              ) : null}
            </ModalBody>
          </ModalContent>
        </Modal>
      </Stack>
    </Container>
  );
};