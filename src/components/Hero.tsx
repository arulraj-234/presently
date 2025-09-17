import { Box, Heading, Text, useColorModeValue } from '@chakra-ui/react';

export const Hero = () => {
  const bg = useColorModeValue('brand.50', 'gray.800');
  const border = useColorModeValue('brand.100', 'gray.700');
  const sub = useColorModeValue('gray.700', 'gray.300');

  return (
    <Box
      p={{ base: 4, md: 6 }}
      mb={2}
      borderWidth={1}
      borderColor={border}
      borderRadius="lg"
      bg={bg}
    >
      <Heading size="md" display="flex" alignItems="center" gap={2}>
        📊 Your Attendance Snapshot
      </Heading>
      <Text mt={2} color={sub}>
        Upload a screenshot of your attendance. We’ll parse each subject and tell you whether you can miss or need to attend more classes.
      </Text>
    </Box>
  );
}
